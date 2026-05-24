"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { getMemberRole } from "./workspace";
import {
  listUserRepos,
  getRepoTree,
  getFileContent,
  listBranches,
  createBranch as gitCreateBranch,
  commitFiles,
  createPullRequest,
  getCommitHistory,
} from "@/lib/github";
import { generateCommitMessage, generatePRDescription } from "@/lib/ai";
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

export async function listAvailableRepos() {
  const session = await auth();
  if (!session?.user?.id) return [];
  try {
    return await listUserRepos(session.user.id);
  } catch (e) {
    console.error("Failed to list user repositories", e);
    return [];
  }
}

export async function connectRepository({
  projectId,
  owner,
  repo,
  fullName,
  defaultBranch = "main",
}: {
  projectId: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch?: string;
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

  if (!userRole || !hasPermission(userRole, "github:connect")) {
    throw new Error("Permission denied to connect repository");
  }

  // 1. Create Repository in database
  const repository = await prisma.gitHubRepository.create({
    data: {
      workspaceId: project.workspaceId,
      projectId,
      owner,
      repo,
      fullName,
      defaultBranch,
      connectedById: userId,
    },
  });

  // 2. Fetch and seed default branches
  try {
    const branches = await listBranches(userId, owner, repo);
    await prisma.gitHubBranch.createMany({
      data: branches.map((b) => ({
        repositoryId: repository.id,
        name: b.name,
        sha: b.sha,
        isDefault: b.name === defaultBranch,
      })),
    });
  } catch (e) {
    console.error("Failed to fetch branches from GitHub", e);
  }

  // 3. Import File Tree from default branch
  try {
    const tree = await getRepoTree(userId, owner, repo, defaultBranch);
    
    // Import blobs (files) into IDEFile
    const filesToCreate = [];
    for (const item of tree) {
      if (item.type === "blob") {
        // Fetch file content
        let content = "";
        try {
          const detail = await getFileContent(userId, owner, repo, item.path, defaultBranch);
          content = detail.content;
        } catch {
          // Fallback to empty if binary or too large
        }

        const fileName = item.path.split("/").pop() || item.path;
        
        filesToCreate.push({
          projectId,
          repositoryId: repository.id,
          path: item.path,
          fileName,
          content,
          githubSha: item.sha,
          status: FileStatus.UNCHANGED,
        });
      }
    }

    if (filesToCreate.length > 0) {
      // Create files in chunks or loop to avoid duplicate path issues
      for (const file of filesToCreate) {
        await prisma.iDEFile.upsert({
          where: {
            projectId_path: {
              projectId: file.projectId,
              path: file.path,
            },
          },
          update: {
            content: file.content,
            githubSha: file.githubSha,
            status: FileStatus.UNCHANGED,
          },
          create: file,
        });
      }
    }
  } catch (e) {
    console.error("Failed to import repository file tree", e);
  }

  // Update project repo link
  await prisma.project.update({
    where: { id: projectId },
    data: { repositoryLink: `https://github.com/${fullName}` },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    userId,
    "GITHUB_REPO_CONNECTED",
    `Connected GitHub repository "${fullName}" to project`
  );

  revalidatePath(`/projects/${projectId}/github`);
  revalidatePath(`/projects/${projectId}/ide`);
  return repository;
}

export async function createRepoBranch(projectId: string, branchName: string, fromBranchName: string = "main") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
  });

  if (!repo) throw new Error("No repository connected to this project");

  const userRole = await getMemberRole(repo.workspaceId, session.user.id);
  if (!userRole || !hasPermission(userRole, "github:create_branch")) {
    throw new Error("Permission denied to create branches");
  }

  // Create on GitHub
  const newBranch = await gitCreateBranch(session.user.id, repo.owner, repo.repo, branchName, fromBranchName);

  // Save to DB
  await prisma.gitHubBranch.create({
    data: {
      repositoryId: repo.id,
      name: branchName,
      sha: newBranch.sha,
      isDefault: false,
    },
  });

  await logActivity(
    repo.workspaceId,
    projectId,
    session.user.id,
    "GITHUB_BRANCH_CREATED",
    `Created git branch "${branchName}" from "${fromBranchName}"`
  );

  revalidatePath(`/projects/${projectId}/github`);
  return newBranch;
}

export async function commitAndPushCode({
  projectId,
  branch,
  commitMessageInput,
  createNewBranch = false,
  newBranchName = "",
  openPR = false,
  prTitle = "",
  prBody = "",
}: {
  projectId: string;
  branch: string;
  commitMessageInput: string;
  createNewBranch?: boolean;
  newBranchName?: string;
  openPR?: boolean;
  prTitle?: string;
  prBody?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
  });

  if (!repo) throw new Error("No repository connected to this project");

  const userRole = await getMemberRole(repo.workspaceId, userId);
  if (!userRole || !hasPermission(userRole, "github:commit")) {
    throw new Error("Permission denied to commit changes");
  }

  // Choose branch to push to
  let targetBranch = branch;
  if (createNewBranch && newBranchName.trim()) {
    const gitBranch = await createRepoBranch(projectId, newBranchName.trim(), branch);
    targetBranch = gitBranch.name;
  }

  // Fetch all modified/added/deleted files in IDEFile
  const modifiedFiles = await prisma.iDEFile.findMany({
    where: {
      projectId,
      NOT: { status: FileStatus.UNCHANGED },
    },
  });

  if (modifiedFiles.length === 0) {
    throw new Error("No modified files to commit");
  }

  // Build files payload for GitHub
  const filesPayload = modifiedFiles
    .filter((f) => f.status !== FileStatus.DELETED)
    .map((f) => ({
      path: f.path,
      content: f.content || "",
    }));

  // Commit on GitHub using Octokit DB API
  const commit = await commitFiles(
    userId,
    repo.owner,
    repo.repo,
    targetBranch,
    commitMessageInput,
    filesPayload
  );

  // Update DB records: delete DELETED files, mark ADDED/MODIFIED as UNCHANGED
  await prisma.$transaction(async (tx) => {
    // 1. Delete DELETED files
    await tx.iDEFile.deleteMany({
      where: {
        projectId,
        status: FileStatus.DELETED,
      },
    });

    // 2. Mark rest as UNCHANGED
    await tx.iDEFile.updateMany({
      where: {
        projectId,
        id: { in: modifiedFiles.filter((f) => f.status !== FileStatus.DELETED).map((f) => f.id) },
      },
      data: {
        status: FileStatus.UNCHANGED,
        githubSha: commit.sha,
      },
    });

    // 3. Log commit in database
    await tx.gitHubCommitLog.create({
      data: {
        repositoryId: repo.id,
        projectId,
        userId,
        branch: targetBranch,
        commitSha: commit.sha,
        commitMessage: commitMessageInput,
        changedFilesCount: modifiedFiles.length,
      },
    });
  });

  await logActivity(
    repo.workspaceId,
    projectId,
    userId,
    "GITHUB_CODE_COMMITTED",
    `Committed ${modifiedFiles.length} files to branch "${targetBranch}"`
  );

  // Notify workspace about commits
  await prisma.notification.create({
    data: {
      userId,
      title: "GitHub Pushed",
      message: `Successfully pushed ${modifiedFiles.length} files to branch ${targetBranch}.`,
      type: "GITHUB_PUSHED",
    },
  });

  // Optional: open a PR
  let pr = null;
  if (openPR && prTitle.trim()) {
    pr = await createPullRequest(
      userId,
      repo.owner,
      repo.repo,
      prTitle.trim(),
      prBody,
      targetBranch,
      repo.defaultBranch
    );

    await logActivity(
      repo.workspaceId,
      projectId,
      userId,
      "GITHUB_PR_CREATED",
      `Opened pull request #${pr.number} on GitHub`
    );
  }

  revalidatePath(`/projects/${projectId}/github`);
  revalidatePath(`/projects/${projectId}/ide`);
  
  return { commit, pr };
}

export async function fetchCommitLogs(projectId: string) {
  return prisma.gitHubCommitLog.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// AI Commit Message Generator helper
export async function getAICommitMessage(projectId: string) {
  const modifiedFiles = await prisma.iDEFile.findMany({
    where: {
      projectId,
      NOT: { status: FileStatus.UNCHANGED },
    },
    select: { path: true, status: true },
  });

  if (modifiedFiles.length === 0) return { message: "No modified files." };

  const mapped = modifiedFiles.map((f) => ({
    path: f.path,
    status: f.status,
  }));

  return generateCommitMessage(mapped);
}
