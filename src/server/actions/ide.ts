"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { getMemberRole } from "./workspace";
import { getLanguageFromFileName } from "@/lib/utils";
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

export async function createIDEFile({
  projectId,
  path,
  fileName,
  content = "",
}: {
  projectId: string;
  path: string;
  fileName: string;
  content?: string;
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

  if (!userRole || !hasPermission(userRole, "ide:edit")) {
    throw new Error("Permission denied to edit files in the IDE");
  }

  // Language auto resolution
  const language = getLanguageFromFileName(fileName);

  const file = await prisma.iDEFile.create({
    data: {
      projectId,
      path,
      fileName,
      language,
      content,
      status: FileStatus.ADDED,
      lastEditedById: userId,
    },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    userId,
    "IDE_FILE_CREATED",
    `Created file "${path}" in IDE`
  );

  return file;
}

export async function updateIDEFileContent(fileId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = await prisma.iDEFile.findUnique({
    where: { id: fileId },
    include: { project: true },
  });

  if (!file) throw new Error("File not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(file.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ide:edit")) {
    throw new Error("Permission denied to edit files in the IDE");
  }

  const newStatus = file.status === FileStatus.ADDED ? FileStatus.ADDED : FileStatus.MODIFIED;

  const updatedFile = await prisma.iDEFile.update({
    where: { id: fileId },
    data: {
      content,
      status: newStatus,
      lastEditedById: userId,
    },
  });

  await logActivity(
    file.project.workspaceId,
    file.projectId,
    userId,
    "IDE_FILE_EDITED",
    `Edited file "${file.path}" in IDE`
  );

  return updatedFile;
}

export async function renameIDEFile(fileId: string, newPath: string, newFileName: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = await prisma.iDEFile.findUnique({
    where: { id: fileId },
    include: { project: true },
  });

  if (!file) throw new Error("File not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(file.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ide:edit")) {
    throw new Error("Permission denied to edit files in the IDE");
  }

  const language = getLanguageFromFileName(newFileName);

  const updatedFile = await prisma.iDEFile.update({
    where: { id: fileId },
    data: {
      path: newPath,
      fileName: newFileName,
      language,
      status: file.status === FileStatus.ADDED ? FileStatus.ADDED : FileStatus.MODIFIED,
      lastEditedById: userId,
    },
  });

  await logActivity(
    file.project.workspaceId,
    file.projectId,
    userId,
    "IDE_FILE_RENAMED",
    `Renamed file "${file.path}" to "${newPath}"`
  );

  return updatedFile;
}

export async function deleteIDEFile(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = await prisma.iDEFile.findUnique({
    where: { id: fileId },
    include: { project: true },
  });

  if (!file) throw new Error("File not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(file.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "ide:edit")) {
    throw new Error("Permission denied to edit files in the IDE");
  }

  // If the file was newly added, delete it from the DB.
  // If it was already on GitHub (Unchanged/Modified), set status to DELETED so we know to drop it on git commit.
  if (file.status === FileStatus.ADDED) {
    await prisma.iDEFile.delete({
      where: { id: fileId },
    });
  } else {
    await prisma.iDEFile.update({
      where: { id: fileId },
      data: {
        status: FileStatus.DELETED,
        lastEditedById: userId,
      },
    });
  }

  await logActivity(
    file.project.workspaceId,
    file.projectId,
    userId,
    "IDE_FILE_DELETED",
    `Deleted file "${file.path}" from IDE`
  );
}

export async function getIDEFiles(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.iDEFile.findMany({
    where: {
      projectId,
      NOT: { status: FileStatus.DELETED },
    },
    orderBy: { path: "asc" },
  });
}

export async function askAICoderAction({
  projectId,
  prompt,
  filePath,
  fileContent,
  mode,
}: {
  projectId: string;
  prompt: string;
  filePath?: string;
  fileContent?: string;
  mode: "chat" | "vibe";
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

  if (!userRole) {
    throw new Error("Permission denied to access project");
  }

  const { generateAICode } = await import("@/lib/ai");
  return generateAICode(prompt, { filePath, fileContent, mode });
}

