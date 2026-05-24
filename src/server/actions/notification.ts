"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function markNotificationAsRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const notification = await prisma.notification.update({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });

  revalidatePath("/dashboard");
  return notification;
}

export async function markAllNotificationsAsRead() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Internal Server Helper (to be called by other actions)
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string
) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
}

export async function sendWorkspaceNotification(
  workspaceId: string,
  title: string,
  message: string,
  type: string = "INFO"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: { role: true },
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "PROJECT_MANAGER")) {
    throw new Error("Only Workspace Admins and Project Managers can broadcast notifications.");
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });

  await prisma.$transaction(
    members.map((m) =>
      prisma.notification.create({
        data: {
          userId: m.userId,
          title,
          message,
          type,
        },
      })
    )
  );

  return { success: true, count: members.length };
}
