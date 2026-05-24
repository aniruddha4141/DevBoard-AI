"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { getMemberRole } from "./workspace";
import { getActiveWorkspaceId } from "./active-workspace";
import { revalidatePath } from "next/cache";

// Helper to log activity
async function logActivity(
  workspaceId: string | null,
  projectId: string | null,
  userId: string,
  action: string,
  description: string
) {
  await prisma.activityLog.create({
    data: {
      workspaceId,
      projectId,
      userId,
      action,
      description,
    },
  });
}

export async function createProject({
  name,
  description,
  status = ProjectStatus.PLANNING,
  deadline,
  techStack = [],
  repositoryLink,
}: {
  name: string;
  description?: string;
  status?: ProjectStatus;
  deadline?: Date | string | null;
  techStack?: string[];
  repositoryLink?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error("No active workspace found");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "project:create")) {
    throw new Error("Permission denied to create projects");
  }

  const projectDeadline = deadline ? new Date(deadline) : null;

  const project = await prisma.$transaction(async (tx) => {
    // 1. Create project
    const p = await tx.project.create({
      data: {
        workspaceId,
        name,
        description,
        status,
        deadline: projectDeadline,
        techStack,
        repositoryLink,
        createdById: userId,
      },
    });

    // 2. Add creator as project member
    await tx.projectMember.create({
      data: {
        userId,
        projectId: p.id,
      },
    });

    return p;
  });

  await logActivity(
    workspaceId,
    project.id,
    userId,
    "PROJECT_CREATED",
    `Created project "${name}"`
  );

  revalidatePath("/projects");
  return project;
}

export async function getProjects() {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return [];

  return prisma.project.findMany({
    where: { workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: {
              name: true,
              githubUsername: true,
              githubAvatarUrl: true,
            },
          },
        },
      },
      tickets: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              githubUsername: true,
              githubAvatarUrl: true,
            },
          },
        },
      },
      repositories: true,
    },
  });

  if (!project) throw new Error("Project not found");

  // Verify membership in workspace
  const isMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId: project.workspaceId,
      },
    },
  });

  if (!isMember) throw new Error("Access denied");

  return project;
}

export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    deadline?: Date | string | null;
    techStack?: string[];
    repositoryLink?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  });

  if (!project) throw new Error("Project not found");

  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole || !hasPermission(userRole, "project:edit")) {
    throw new Error("Permission denied to edit projects");
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.deadline !== undefined) {
    updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  await logActivity(
    project.workspaceId,
    projectId,
    session.user.id,
    "PROJECT_UPDATED",
    `Updated project details for "${updatedProject.name}"`
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return updatedProject;
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  });

  if (!project) throw new Error("Project not found");

  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole || !hasPermission(userRole, "project:delete")) {
    throw new Error("Permission denied to delete projects");
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  await logActivity(
    project.workspaceId,
    null,
    session.user.id,
    "PROJECT_DELETED",
    `Deleted project "${project.name}"`
  );

  revalidatePath("/projects");
}

export async function assignMemberToProject(projectId: string, targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) throw new Error("Project not found");

  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole || !hasPermission(userRole, "project:assign_member")) {
    throw new Error("Permission denied to assign project members");
  }

  const assignment = await prisma.projectMember.create({
    data: {
      userId: targetUserId,
      projectId,
    },
    include: {
      user: {
        select: { name: true, githubUsername: true },
      },
    },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    session.user.id,
    "PROJECT_MEMBER_ASSIGNED",
    `Assigned ${assignment.user.githubUsername || assignment.user.name} to project`
  );

  // Send system notification
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: "Project Assignment",
      message: `You have been assigned to a new project.`,
      type: "PROJECT_ASSIGNED",
    },
  });

  revalidatePath(`/projects/${projectId}/team`);
  return assignment;
}

export async function removeMemberFromProject(projectId: string, targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) throw new Error("Project not found");

  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole || !hasPermission(userRole, "project:assign_member")) {
    throw new Error("Permission denied to manage project members");
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: targetUserId,
        projectId,
      },
    },
    include: {
      user: { select: { name: true, githubUsername: true } },
    },
  });

  if (!member) throw new Error("Member is not assigned to this project");

  await prisma.projectMember.delete({
    where: {
      userId_projectId: {
        userId: targetUserId,
        projectId,
      },
    },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    session.user.id,
    "PROJECT_MEMBER_REMOVED",
    `Removed ${member.user.githubUsername || member.user.name} from project`
  );

  revalidatePath(`/projects/${projectId}/team`);
}
