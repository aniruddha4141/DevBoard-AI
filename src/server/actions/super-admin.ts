"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (!dbUser?.isSuperAdmin) {
    throw new Error("Access Denied: Super Admin privileges required.");
  }

  return userId;
}

export async function superDeleteWorkspace(workspaceId: string) {
  await verifySuperAdmin();

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  revalidatePath("/workspaces");
  return { success: true };
}

export async function superDeleteUser(targetUserId: string) {
  const superAdminId = await verifySuperAdmin();
  
  if (superAdminId === targetUserId) {
    throw new Error("You cannot delete your own Super Admin account.");
  }

  await prisma.user.delete({
    where: { id: targetUserId },
  });

  revalidatePath("/workspaces");
  return { success: true };
}

export async function superToggleAdmin(targetUserId: string) {
  const superAdminId = await verifySuperAdmin();

  if (superAdminId === targetUserId) {
    throw new Error("You cannot modify your own Super Admin privileges.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { isSuperAdmin: true },
  });

  if (!target) throw new Error("User not found.");

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isSuperAdmin: !target.isSuperAdmin,
    },
  });

  revalidatePath("/workspaces");
  return { success: true, isSuperAdmin: updated.isSuperAdmin };
}
