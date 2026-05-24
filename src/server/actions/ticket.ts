"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TicketType, TicketStatus, TicketPriority } from "@prisma/client";
import { hasPermission, canEditTicket } from "@/lib/permissions";
import { getMemberRole } from "./workspace";
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

export async function createTicket({
  projectId,
  title,
  description,
  type = TicketType.TASK,
  status = TicketStatus.BACKLOG,
  priority = TicketPriority.MEDIUM,
  assigneeId,
  dueDate,
}: {
  projectId: string;
  title: string;
  description?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  });

  if (!project) throw new Error("Project not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ticket:create")) {
    throw new Error("Permission denied to create tickets");
  }

  const parsedDueDate = dueDate ? new Date(dueDate) : null;

  const ticket = await prisma.ticket.create({
    data: {
      projectId,
      title,
      description,
      type,
      status,
      priority,
      assigneeId: assigneeId || null,
      reporterId: userId,
      dueDate: parsedDueDate,
    },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    userId,
    "TICKET_CREATED",
    `Created ticket "${title}"`
  );

  // Notify assignee
  if (assigneeId) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        title: "Ticket Assignment",
        message: `You have been assigned the ticket: "${title}".`,
        type: "TICKET_ASSIGNED",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/tickets`);
  return ticket;
}

export async function getTickets(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.ticket.findMany({
    where: { projectId },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
      reporter: {
        select: {
          name: true,
          githubUsername: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function changeTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true },
  });

  if (!ticket) throw new Error("Ticket not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(ticket.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ticket:change_status")) {
    throw new Error("Permission denied to update ticket status");
  }

  // Developers can only update tickets assigned to themselves
  if (userRole === "DEVELOPER" && ticket.assigneeId !== userId) {
    throw new Error("Developers can only update their own assigned tickets");
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: newStatus },
  });

  await logActivity(
    ticket.project.workspaceId,
    ticket.projectId,
    userId,
    "TICKET_STATUS_CHANGED",
    `Changed status of ticket "${ticket.title}" to ${newStatus}`
  );

  revalidatePath(`/projects/${ticket.projectId}/tickets`);
  return updatedTicket;
}

export async function updateTicket(
  ticketId: string,
  data: {
    title?: string;
    description?: string;
    type?: TicketType;
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
    dueDate?: Date | string | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true },
  });

  if (!ticket) throw new Error("Ticket not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(ticket.project.workspaceId, userId);

  if (!userRole || !canEditTicket(userRole, userId, ticket.assigneeId)) {
    throw new Error("Permission denied to update this ticket");
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData,
  });

  await logActivity(
    ticket.project.workspaceId,
    ticket.projectId,
    userId,
    "TICKET_UPDATED",
    `Updated ticket details for "${ticket.title}"`
  );

  // Notify new assignee if changed
  if (data.assigneeId && data.assigneeId !== ticket.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: data.assigneeId,
        title: "Ticket Assignment",
        message: `You have been assigned the ticket: "${updatedTicket.title}".`,
        type: "TICKET_ASSIGNED",
      },
    });
  }

  revalidatePath(`/projects/${ticket.projectId}/tickets`);
  return updatedTicket;
}

export async function deleteTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true },
  });

  if (!ticket) throw new Error("Ticket not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(ticket.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ticket:delete")) {
    throw new Error("Permission denied to delete tickets");
  }

  await prisma.ticket.delete({
    where: { id: ticketId },
  });

  await logActivity(
    ticket.project.workspaceId,
    ticket.projectId,
    userId,
    "TICKET_DELETED",
    `Deleted ticket "${ticket.title}"`
  );

  revalidatePath(`/projects/${ticket.projectId}/tickets`);
}

// ============================================================
// COMMENT ACTIONS
// ============================================================

export async function addComment(ticketId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true },
  });

  if (!ticket) throw new Error("Ticket not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(ticket.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ticket:comment")) {
    throw new Error("Permission denied to comment on tickets");
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
    },
  });

  revalidatePath(`/projects/${ticket.projectId}/tickets`);
  return comment;
}

export async function getComments(ticketId: string) {
  return prisma.ticketComment.findMany({
    where: { ticketId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
