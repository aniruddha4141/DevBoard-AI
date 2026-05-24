import { Octokit } from "@octokit/rest";
import { prisma } from "@/lib/prisma";

// ============================================================
// GITHUB API CLIENT
// ============================================================

export async function getOctokit(userId: string): Promise<Octokit> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github",
    },
  });

  if (!account?.access_token) {
    throw new Error("GitHub account not connected. Please sign in with GitHub.");
  }

  return new Octokit({ auth: account.access_token });
}

// ============================================================
// REPOSITORY OPERATIONS
// ============================================================

export async function listUserRepos(userId: string) {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
    type: "all",
  });
  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    description: repo.description,
    defaultBranch: repo.default_branch,
    isPrivate: repo.private,
    htmlUrl: repo.html_url,
    language: repo.language,
    updatedAt: repo.updated_at,
  }));
}

export async function getRepoTree(
  userId: string,
  owner: string,
  repo: string,
  branch: string = "main"
) {
  const octokit = await getOctokit(userId);

  try {
    const { data } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });

    return data.tree
      .filter((item) => item.type === "blob" || item.type === "tree")
      .map((item) => ({
        path: item.path!,
        type: item.type as "blob" | "tree",
        sha: item.sha!,
        size: item.size || 0,
      }));
  } catch {
    console.error("Failed to fetch repo tree");
    return [];
  }
}

export async function getFileContent(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
) {
  const octokit = await getOctokit(userId);

  const params: { owner: string; repo: string; path: string; ref?: string } = {
    owner,
    repo,
    path,
  };
  if (ref) params.ref = ref;

  const { data } = await octokit.repos.getContent(params);

  if ("content" in data && data.type === "file") {
    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
      name: data.name,
      path: data.path,
      size: data.size,
    };
  }

  throw new Error("Path is not a file");
}

// ============================================================
// BRANCH OPERATIONS
// ============================================================

export async function listBranches(
  userId: string,
  owner: string,
  repo: string
) {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
  return data.map((b) => ({
    name: b.name,
    sha: b.commit.sha,
    protected: b.protected,
  }));
}

export async function createBranch(
  userId: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = "main"
) {
  const octokit = await getOctokit(userId);

  // Get the SHA of the source branch
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });

  // Create new branch
  const { data } = await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });

  return { name: branchName, sha: data.object.sha };
}

// ============================================================
// COMMIT OPERATIONS (Multi-file using Git Database API)
// ============================================================

interface FileChange {
  path: string;
  content: string;
  mode?: "100644" | "100755" | "040000" | "160000" | "120000";
}

export async function commitFiles(
  userId: string,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: FileChange[]
) {
  const octokit = await getOctokit(userId);

  // 1. Get the latest commit SHA on the branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree SHA from the latest commit
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });
      return {
        path: file.path,
        mode: file.mode || ("100644" as const),
        type: "blob" as const,
        sha: blob.sha,
      };
    })
  );

  // 4. Create a new tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    base_tree: baseTreeSha,
  });

  // 5. Create a new commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // 6. Update the branch reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return {
    sha: newCommit.sha,
    message: newCommit.message,
    url: newCommit.html_url,
  };
}

// ============================================================
// PULL REQUEST OPERATIONS
// ============================================================

export async function createPullRequest(
  userId: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  headBranch: string,
  baseBranch: string = "main"
) {
  const octokit = await getOctokit(userId);

  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: headBranch,
    base: baseBranch,
  });

  return {
    number: data.number,
    title: data.title,
    htmlUrl: data.html_url,
    state: data.state,
  };
}

// ============================================================
// COMMIT HISTORY
// ============================================================

export async function getCommitHistory(
  userId: string,
  owner: string,
  repo: string,
  branch?: string,
  perPage: number = 20
) {
  const octokit = await getOctokit(userId);

  const params: {
    owner: string;
    repo: string;
    per_page: number;
    sha?: string;
  } = { owner, repo, per_page: perPage };
  if (branch) params.sha = branch;

  const { data } = await octokit.repos.listCommits(params);

  return data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    author: commit.commit.author?.name || "Unknown",
    authorAvatar: commit.author?.avatar_url,
    date: commit.commit.author?.date,
    url: commit.html_url,
  }));
}
