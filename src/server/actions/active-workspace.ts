"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_WORKSPACE_COOKIE = "activeWorkspaceId";

export async function setActiveWorkspaceId(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return { success: true };
}

export async function getActiveWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieVal) {
    // Verify user is still a member of this workspace
    const session = await auth();
    if (!session?.user?.id) return null;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: cookieVal,
        },
      },
    });

    if (membership) return cookieVal;
  }

  // Fallback: Get first workspace user is member of
  const session = await auth();
  if (!session?.user?.id) return null;

  const firstMember = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: { workspaceId: true },
  });

  if (firstMember) {
    return firstMember.workspaceId;
  }

  return null;
}

export async function getActiveWorkspace() {
  const wsId = await getActiveWorkspaceId();
  if (!wsId) return null;

  return prisma.workspace.findUnique({
    where: { id: wsId },
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
    },
  });
}
