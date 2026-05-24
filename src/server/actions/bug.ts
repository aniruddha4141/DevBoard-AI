"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BugSeverity, BugStatus, TicketType, TicketStatus, TicketPriority } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { getMemberRole } from "./workspace";
import { createTicket } from "./ticket";
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

export async function createBugReport({
  projectId,
  title,
  errorMessage,
  component,
  severity = BugSeverity.MEDIUM,
  stepsToReproduce,
  expectedResult,
  actualResult,
  screenshotUrl,
  assignedDeveloperId,
}: {
  projectId: string;
  title: string;
  errorMessage?: string;
  component?: string;
  severity?: BugSeverity;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  screenshotUrl?: string;
  assignedDeveloperId?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) throw new Error("Project not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "bug:create")) {
    throw new Error("Permission denied to report bugs");
  }

  const bug = await prisma.bugReport.create({
    data: {
      projectId,
      title,
      errorMessage,
      component,
      severity,
      stepsToReproduce,
      expectedResult,
      actualResult,
      screenshotUrl,
      assignedDeveloperId: assignedDeveloperId || null,
      createdById: userId,
      status: BugStatus.OPEN,
    },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    userId,
    "BUG_REPORTED",
    `Reported bug "${title}"`
  );

  // Send notification to developer if assigned
  if (assignedDeveloperId) {
    await prisma.notification.create({
      data: {
        userId: assignedDeveloperId,
        title: "Bug Assigned",
        message: `You have been assigned the bug: "${title}".`,
        type: "BUG_ASSIGNED",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/bugs`);
  return bug;
}

export async function getBugReports(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.bugReport.findMany({
    where: { projectId },
    include: {
      assignedDeveloper: {
        select: {
          id: true,
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          githubUsername: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateBugReport(
  bugId: string,
  data: {
    title?: string;
    errorMessage?: string;
    component?: string;
    severity?: BugSeverity;
    status?: BugStatus;
    stepsToReproduce?: string;
    expectedResult?: string;
    actualResult?: string;
    assignedDeveloperId?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bug = await prisma.bugReport.findUnique({
    where: { id: bugId },
    include: { project: true },
  });

  if (!bug) throw new Error("Bug report not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(bug.project.workspaceId, userId);

  // Users allowed to edit bugs: Admin, PM, or assigned Developer
  const isAssignedDev = bug.assignedDeveloperId === userId;
  const canEdit =
    userRole === "ADMIN" ||
    userRole === "PROJECT_MANAGER" ||
    (userRole === "DEVELOPER" && isAssignedDev);

  if (!userRole || !canEdit) {
    throw new Error("Permission denied to update this bug report");
  }

  const updatedBug = await prisma.bugReport.update({
    where: { id: bugId },
    data: {
      ...data,
      assignedDeveloperId: data.assignedDeveloperId !== undefined ? data.assignedDeveloperId : undefined,
    },
  });

  await logActivity(
    bug.project.workspaceId,
    bug.projectId,
    userId,
    "BUG_UPDATED",
    `Updated bug report "${bug.title}"`
  );

  // Notify new developer if assigned
  if (data.assignedDeveloperId && data.assignedDeveloperId !== bug.assignedDeveloperId) {
    await prisma.notification.create({
      data: {
        userId: data.assignedDeveloperId,
        title: "Bug Assigned",
        message: `You have been assigned the bug: "${updatedBug.title}".`,
        type: "BUG_ASSIGNED",
      },
    });
  }

  revalidatePath(`/projects/${bug.projectId}/bugs`);
  return updatedBug;
}

export async function deleteBugReport(bugId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bug = await prisma.bugReport.findUnique({
    where: { id: bugId },
    include: { project: true },
  });

  if (!bug) throw new Error("Bug report not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(bug.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "bug:delete")) {
    throw new Error("Permission denied to delete bug reports");
  }

  await prisma.bugReport.delete({
    where: { id: bugId },
  });

  await logActivity(
    bug.project.workspaceId,
    bug.projectId,
    userId,
    "BUG_DELETED",
    `Deleted bug report "${bug.title}"`
  );

  revalidatePath(`/projects/${bug.projectId}/bugs`);
}

export async function convertBugToTicket(bugId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bug = await prisma.bugReport.findUnique({
    where: { id: bugId },
    include: { project: true },
  });

  if (!bug) throw new Error("Bug report not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(bug.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "bug:convert_to_ticket")) {
    throw new Error("Permission denied to convert bugs to tickets");
  }

  // Description compile
  const ticketDescription = `
**Error Message:**
${bug.errorMessage || "N/A"}

**Component:**
${bug.component || "N/A"}

**Steps to Reproduce:**
${bug.stepsToReproduce || "N/A"}

**Expected Result:**
${bug.expectedResult || "N/A"}

**Actual Result:**
${bug.actualResult || "N/A"}
  `.trim();

  // Convert severity to priority
  let ticketPriority: TicketPriority = TicketPriority.MEDIUM;
  if (bug.severity === BugSeverity.CRITICAL) ticketPriority = TicketPriority.CRITICAL;
  else if (bug.severity === BugSeverity.HIGH) ticketPriority = TicketPriority.HIGH;
  else if (bug.severity === BugSeverity.LOW) ticketPriority = TicketPriority.LOW;

  const ticket = await prisma.$transaction(async (tx) => {
    // 1. Create the Ticket
    const t = await tx.ticket.create({
      data: {
        projectId: bug.projectId,
        title: `Fix Bug: ${bug.title}`,
        description: ticketDescription,
        type: TicketType.BUG,
        status: TicketStatus.TODO,
        priority: ticketPriority,
        assigneeId: bug.assignedDeveloperId,
        reporterId: userId,
      },
    });

    // 2. Update Bug status to closed (or investigating)
    await tx.bugReport.update({
      where: { id: bug.id },
      data: { status: BugStatus.INVESTIGATING },
    });

    return t;
  });

  await logActivity(
    bug.project.workspaceId,
    bug.projectId,
    userId,
    "BUG_CONVERTED_TO_TICKET",
    `Converted bug "${bug.title}" into ticket "${ticket.title}"`
  );

  revalidatePath(`/projects/${bug.projectId}/bugs`);
  revalidatePath(`/projects/${bug.projectId}/tickets`);

  return ticket;
}
