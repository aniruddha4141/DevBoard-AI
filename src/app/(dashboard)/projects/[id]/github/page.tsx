import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { fetchCommitLogs } from "@/server/actions/github";
import { GitHubPanelClient } from "@/components/github/GitHubPanelClient";
import { prisma } from "@/lib/prisma";
import { FileStatus } from "@prisma/client";
import { redirect } from "next/navigation";

interface GitHubPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectGitHubPage({ params }: GitHubPageProps) {
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

  // 3. Fetch connected repository
  const connectedRepo = await prisma.gitHubRepository.findFirst({
    where: { projectId: id },
    select: {
      id: true,
      owner: true,
      repo: true,
      fullName: true,
      defaultBranch: true,
    },
  });

  // 4. Fetch branches
  let branches: { id: string; name: string; sha: string | null; isDefault: boolean }[] = [];
  if (connectedRepo) {
    branches = await prisma.gitHubBranch.findMany({
      where: { repositoryId: connectedRepo.id },
      select: {
        id: true,
        name: true,
        sha: true,
        isDefault: true,
      },
    });
  }

  // 5. Fetch modified files
  const modifiedFiles = await prisma.iDEFile.findMany({
    where: {
      projectId: id,
      NOT: { status: FileStatus.UNCHANGED },
    },
    select: {
      id: true,
      path: true,
      status: true,
    },
  });

  // 6. Fetch database commit logs
  const dbCommitLogs = await fetchCommitLogs(id);

  // Map database dates
  const serializedCommitLogs = dbCommitLogs.map((log) => ({
    id: log.id,
    branch: log.branch,
    commitSha: log.commitSha,
    commitMessage: log.commitMessage,
    changedFilesCount: log.changedFilesCount,
    createdAt: new Date(log.createdAt),
    user: {
      name: log.user.name,
      githubUsername: log.user.githubUsername,
      githubAvatarUrl: log.user.githubAvatarUrl,
    },
  }));

  return (
    <div className="animate-in fade-in-0 duration-300">
      <GitHubPanelClient
        projectId={id}
        connectedRepo={connectedRepo}
        branches={branches}
        modifiedFiles={modifiedFiles}
        commitLogs={serializedCommitLogs}
        userRole={userRole}
      />
    </div>
  );
}
