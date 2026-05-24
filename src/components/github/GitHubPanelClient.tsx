"use client";

import * as React from "react";
import {
  connectRepository,
  commitAndPushCode,
  createRepoBranch,
  getAICommitMessage,
  listAvailableRepos,
  fetchCommitLogs,
} from "@/server/actions/github";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Github,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Sparkles,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
}

interface CommitLog {
  id: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  changedFilesCount: number;
  createdAt: Date;
  user: {
    name: string | null;
    githubUsername: string | null;
    githubAvatarUrl: string | null;
  };
}

interface Branch {
  id: string;
  name: string;
  sha: string | null;
  isDefault: boolean;
}

interface GitHubPanelClientProps {
  projectId: string;
  connectedRepo: {
    id: string;
    owner: string;
    repo: string;
    fullName: string;
    defaultBranch: string;
  } | null;
  branches: Branch[];
  modifiedFiles: { id: string; path: string; status: string }[];
  commitLogs: CommitLog[];
  userRole: WorkspaceRole;
}

export function GitHubPanelClient({
  projectId,
  connectedRepo,
  branches,
  modifiedFiles,
  commitLogs: initialCommitLogs,
  userRole,
}: GitHubPanelClientProps) {
  const [repos, setRepos] = React.useState<Repo[]>([]);
  const [selectedRepoFullName, setSelectedRepoFullName] = React.useState("");
  const [isLinking, setIsLinking] = React.useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = React.useState(false);

  // Commit form states
  const [commitMsg, setCommitMsg] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState(
    connectedRepo?.defaultBranch || "main"
  );
  const [createNewBranch, setCreateNewBranch] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState("");
  const [isCommitting, setIsCommitting] = React.useState(false);
  const [isGeneratingMsg, setIsGeneratingMsg] = React.useState(false);

  // PR Form states
  const [prOpen, setPrOpen] = React.useState(false);
  const [prTitle, setPrTitle] = React.useState("");
  const [prBody, setPrBody] = React.useState("");

  // Commit history list
  const [commitLogs, setCommitLogs] = React.useState<CommitLog[]>(initialCommitLogs);

  const canEdit = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
  const canCommit = userRole !== "VIEWER";

  // Load repos if not connected
  React.useEffect(() => {
    if (!connectedRepo && canEdit) {
      const loadRepos = async () => {
        setIsLoadingRepos(true);
        try {
          const list = await listAvailableRepos();
          setRepos(list);
        } catch {
          toast.error("Failed to load GitHub repositories");
        } finally {
          setIsLoadingRepos(false);
        }
      };
      loadRepos();
    }
  }, [connectedRepo, canEdit]);

  const handleLinkRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoFullName) return;

    const repoInfo = repos.find((r) => r.fullName === selectedRepoFullName);
    if (!repoInfo) return;

    setIsLinking(true);
    try {
      await connectRepository({
        projectId,
        owner: repoInfo.owner,
        repo: repoInfo.name,
        fullName: repoInfo.fullName,
        defaultBranch: repoInfo.defaultBranch,
      });

      toast.success("Repository connected successfully!");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to link repository");
    } finally {
      setIsLinking(false);
    }
  };

  const handleAICommitMsg = async () => {
    setIsGeneratingMsg(true);
    try {
      const res = await getAICommitMessage(projectId);
      setCommitMsg(res.message);
      toast.success("AI Commit Message generated!");
    } catch {
      toast.error("Failed to compile AI message");
    } finally {
      setIsGeneratingMsg(false);
    }
  };

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim()) {
      toast.error("Commit message is required");
      return;
    }

    if (createNewBranch && !newBranchName.trim()) {
      toast.error("New branch name is required");
      return;
    }

    setIsCommitting(true);
    try {
      const res = await commitAndPushCode({
        projectId,
        branch: selectedBranch,
        commitMessageInput: commitMsg.trim(),
        createNewBranch,
        newBranchName: newBranchName.trim(),
        openPR: prOpen,
        prTitle: prTitle.trim(),
        prBody,
      });

      toast.success(
        res.pr
          ? `Code pushed & PR #${res.pr.number} opened!`
          : "Code committed and pushed successfully!"
      );

      // Reset form
      setCommitMsg("");
      setNewBranchName("");
      setCreateNewBranch(false);
      setPrOpen(false);
      setPrTitle("");
      setPrBody("");

      // Reload logs
      const logs = await fetchCommitLogs(projectId);
      setCommitLogs(logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt) })));

      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to push commit");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* 1. NOT CONNECTED STATE */}
      {!connectedRepo ? (
        <Card className="border border-border bg-card/45 p-8 max-w-xl mx-auto text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4 text-foreground/80">
            <Github className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Connect a GitHub Repository</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm">
            Import your code files tree directly into DevBoard AI browser-based IDE by connecting your GitHub Repository.
          </p>

          {canEdit ? (
            <form onSubmit={handleLinkRepo} className="w-full mt-6 space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="repo-select">Repository</Label>
                <Select
                  id="repo-select"
                  value={selectedRepoFullName}
                  onChange={(e) => setSelectedRepoFullName(e.target.value)}
                  disabled={isLoadingRepos || isLinking}
                >
                  <option value="">Select a repository...</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.fullName}>
                      {r.fullName} ({r.defaultBranch})
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="submit"
                disabled={isLinking || !selectedRepoFullName}
                className="w-full h-10 font-semibold gap-2 cursor-pointer"
              >
                {isLinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Connect & Import Tree <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-red-400 mt-4 italic font-semibold">
              Only Administrators and Project Managers can connect repositories.
            </p>
          )}
        </Card>
      ) : (
        /* 2. CONNECTED PANEL STATE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns: Commit Form & Repo Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Repo Info card */}
            <Card className="border border-border bg-card/45">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <Github className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {connectedRepo.fullName}
                    </h3>
                    <span className="text-[10px] text-muted-foreground block">
                      Default branch: <span className="font-semibold text-foreground">{connectedRepo.defaultBranch}</span>
                    </span>
                  </div>
                </div>
                <Badge variant="success" className="w-fit">CONNECTED</Badge>
              </CardContent>
            </Card>

            {/* Commit & Push Code Card */}
            {canCommit && (
              <Card className="border border-border bg-card/45">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <GitCommit className="h-4 w-4" /> Commit Modified IDE Files
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Create multi-file commits using GitHub Git Database API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Modified files counter */}
                  {modifiedFiles.length === 0 ? (
                    <div className="p-4 rounded-lg bg-secondary/15 border border-border text-center text-xs text-muted-foreground">
                      No modified files in IDE. Go to the{" "}
                      <a href={`/projects/${projectId}/ide`} className="text-primary hover:underline font-semibold">
                        IDE
                      </a>{" "}
                      tab to edit and save files first.
                    </div>
                  ) : (
                    <form onSubmit={handleCommitSubmit} className="space-y-4">
                      {/* Changed files list summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Changed Files ({modifiedFiles.length})</span>
                        <div className="border border-border/80 rounded-lg max-h-32 overflow-y-auto p-2 bg-black/35 space-y-1">
                          {modifiedFiles.map((file) => (
                            <div key={file.id} className="flex justify-between items-center text-[10px] py-0.5 font-mono">
                              <span className="truncate pr-4 text-foreground/80">{file.path}</span>
                              <Badge
                                variant={
                                  file.status === "ADDED"
                                    ? "success"
                                    : file.status === "DELETED"
                                    ? "destructive"
                                    : "warning"
                                }
                                className="text-[8px] py-0 px-1 font-bold"
                              >
                                {file.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Commit Message Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="commit-msg">Commit Message</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAICommitMsg}
                            disabled={isGeneratingMsg}
                            className="h-6 text-[10px] text-primary font-semibold gap-1"
                          >
                            {isGeneratingMsg ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" /> Generate with AI
                              </>
                            )}
                          </Button>
                        </div>
                        <Textarea
                          id="commit-msg"
                          placeholder="feat(auth): configure JWT routing and validations..."
                          value={commitMsg}
                          onChange={(e) => setCommitMsg(e.target.value)}
                          required
                          disabled={isCommitting}
                          rows={3}
                          className="text-xs"
                        />
                      </div>

                      {/* Branch Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="commit-branch">Target Branch</Label>
                          <Select
                            id="commit-branch"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            disabled={createNewBranch || isCommitting}
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.name}>
                                {b.name} {b.isDefault ? "(default)" : ""}
                              </option>
                            ))}
                          </Select>
                        </div>

                        {/* Toggle new branch input */}
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer mb-2.5">
                            <input
                              type="checkbox"
                              checked={createNewBranch}
                              onChange={(e) => setCreateNewBranch(e.target.checked)}
                              disabled={isCommitting}
                              className="rounded border-border text-primary focus:ring-ring"
                            />
                            Create a new branch for this commit
                          </label>
                        </div>
                      </div>

                      {/* New branch name input if toggled */}
                      {createNewBranch && (
                        <div className="space-y-1.5 animate-in fade-in-0 duration-150">
                          <Label htmlFor="new-branch-name">New Branch Name</Label>
                          <Input
                            id="new-branch-name"
                            placeholder="e.g. feature/jwt-authentication"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                            required={createNewBranch}
                            disabled={isCommitting}
                            className="h-9 text-xs"
                          />
                        </div>
                      )}

                      {/* PR form toggle checkbox */}
                      <div className="border-t border-border pt-4">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={prOpen}
                            onChange={(e) => setPrOpen(e.target.checked)}
                            disabled={isCommitting}
                            className="rounded border-border text-primary focus:ring-ring"
                          />
                          Open a pull request after pushing changes
                        </label>
                      </div>

                      {/* PR Form Inputs */}
                      {prOpen && (
                        <div className="space-y-3.5 border border-border/80 p-3 rounded-lg bg-secondary/15 animate-in fade-in-0 duration-150">
                          <div className="space-y-1.5">
                            <Label htmlFor="pr-title">PR Title</Label>
                            <Input
                              id="pr-title"
                              placeholder="e.g. Configure JWT authentication middleware"
                              value={prTitle}
                              onChange={(e) => setPrTitle(e.target.value)}
                              required={prOpen}
                              disabled={isCommitting}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="pr-desc">PR Description</Label>
                            <Textarea
                              id="pr-desc"
                              placeholder="Describe changes, testing completed..."
                              value={prBody}
                              onChange={(e) => setPrBody(e.target.value)}
                              disabled={isCommitting}
                              rows={3}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isCommitting}
                        className="w-full h-10 font-semibold gap-2 cursor-pointer mt-2"
                      >
                        {isCommitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <GitPullRequest className="h-4 w-4" /> Push Commit & Sync
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Branch lists & Commit Logs */}
          <div className="space-y-6">
            {/* Branches Card */}
            <Card className="border border-border bg-card/45">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-primary" /> Active Branches ({branches.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {branches.map((b) => (
                  <div key={b.id} className="flex justify-between items-center text-xs p-2 rounded-lg border border-border bg-secondary/15">
                    <span className="font-mono font-semibold text-foreground truncate">{b.name}</span>
                    {b.isDefault && <Badge variant="success" className="text-[8px] py-0 px-1 font-bold">DEFAULT</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Commit Logs Card */}
            <Card className="border border-border bg-card/45">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <GitCommit className="h-4 w-4" /> Workspace Commits
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Recent code push logs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {commitLogs.length === 0 ? (
                  <span className="text-xs text-muted-foreground block text-center py-6">No commits pushed yet</span>
                ) : (
                  commitLogs.map((log) => (
                    <div key={log.id} className="text-xs space-y-1 p-2 rounded-lg border border-border/80 bg-secondary/15">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span className="font-semibold">{log.user.githubUsername || log.user.name}</span>
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="text-foreground leading-snug font-semibold">{log.commitMessage}</p>
                      <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1.5 border-t border-border/30">
                        <span className="font-mono">SHA: {log.commitSha.slice(0, 7)}</span>
                        <span>{log.changedFilesCount} files</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
