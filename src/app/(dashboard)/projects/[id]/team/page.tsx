import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { ProjectTeamPanelClient } from "@/components/team/ProjectTeamPanelClient";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

interface ProjectTeamPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectTeamPage({ params }: ProjectTeamPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch project
  let project;
  try {
    project = await getProject(id);
  } catch {
    redirect("/projects");
  }

  // 2. Fetch user role in the workspace
  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole) {
    redirect("/projects");
  }

  // 3. Fetch workspace members that are NOT assigned to this project
  const assignedUserIds = project.members.map((m) => m.user.id);

  const unassignedWorkspaceMemberships = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: project.workspaceId,
      userId: { notIn: assignedUserIds },
    },
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
  });

  const unassignedMembers = unassignedWorkspaceMemberships.map((m) => m.user);

  return (
    <div className="animate-in fade-in-0 duration-300">
      <ProjectTeamPanelClient
        projectId={id}
        assignedMembers={project.members}
        unassignedMembers={unassignedMembers}
        userRole={userRole}
      />
    </div>
  );
}
