"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createWorkspace, joinWorkspaceWithCode } from "@/server/actions/workspace";
import { setActiveWorkspaceId } from "@/server/actions/active-workspace";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  KeyRound,
  Users,
  ArrowRight,
  Loader2,
  Landmark,
  Check,
  LogOut,
  Sparkles,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
}

interface SuperAdminWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  createdBy: {
    name: string | null;
    email: string | null;
    githubUsername: string | null;
  };
}

interface SuperAdminUser {
  id: string;
  name: string | null;
  email: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
}

interface WorkspacesPanelClientProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    isSuperAdmin?: boolean;
  };
  superAdminWorkspaces?: SuperAdminWorkspace[];
  superAdminUsers?: SuperAdminUser[];
}

export function WorkspacesPanelClient({
  workspaces,
  activeWorkspaceId,
  user,
  superAdminWorkspaces,
  superAdminUsers,
}: WorkspacesPanelClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"list" | "create" | "join" | "super-admin">(
    workspaces.length > 0 ? "list" : "create"
  );

  const [superAdminSubTab, setSuperAdminSubTab] = React.useState<"workspaces" | "users">("workspaces");
  const [adminWorkspaces, setAdminWorkspaces] = React.useState<SuperAdminWorkspace[]>(
    superAdminWorkspaces || []
  );
  const [adminUsers, setAdminUsers] = React.useState<SuperAdminUser[]>(
    superAdminUsers || []
  );
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Sync state if props update
  React.useEffect(() => {
    if (superAdminWorkspaces) {
      setAdminWorkspaces(superAdminWorkspaces);
    }
  }, [superAdminWorkspaces]);

  React.useEffect(() => {
    if (superAdminUsers) {
      setAdminUsers(superAdminUsers);
    }
  }, [superAdminUsers]);

  const handleSuperDeleteWorkspace = async (workspaceId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this workspace? This will delete all its projects, tickets, settings, and other resources. This action is permanent and CANNOT be undone!"
      )
    )
      return;

    setActionLoadingId(workspaceId);
    try {
      const { superDeleteWorkspace } = await import("@/server/actions/super-admin");
      await superDeleteWorkspace(workspaceId);
      setAdminWorkspaces((prev) => prev.filter((ws) => ws.id !== workspaceId));
      toast.success("Workspace deleted successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workspace");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuperDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This will delete their account, sessions, and memberships. This action is permanent and CANNOT be undone!"
      )
    )
      return;

    setActionLoadingId(userId);
    try {
      const { superDeleteUser } = await import("@/server/actions/super-admin");
      await superDeleteUser(userId);
      setAdminUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuperToggleAdmin = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      const { superToggleAdmin } = await import("@/server/actions/super-admin");
      const res = await superToggleAdmin(userId);
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isSuperAdmin: res.isSuperAdmin } : u))
      );
      toast.success(`User admin privileges updated`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create Workspace states
  const [wsName, setWsName] = React.useState("");
  const [wsDesc, setWsDesc] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Join Workspace states
  const [inviteCode, setInviteCode] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);

  const [isSwitchingId, setIsSwitchingId] = React.useState<string | null>(null);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsCreating(true);
    try {
      const workspace = await createWorkspace(wsName.trim(), wsDesc.trim() || undefined);
      toast.success(`Workspace "${workspace.name}" created!`);
      await setActiveWorkspaceId(workspace.id);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Invite code is required");
      return;
    }

    setIsJoining(true);
    try {
      const workspace = await joinWorkspaceWithCode(inviteCode.trim());
      toast.success(`Joined workspace "${workspace.name}"!`);
      await setActiveWorkspaceId(workspace.id);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join workspace");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSwitchWorkspace = async (id: string) => {
    setIsSwitchingId(id);
    try {
      await setActiveWorkspaceId(id);
      toast.success("Switched workspace");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to switch workspace");
      setIsSwitchingId(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden grid-bg py-12 px-4">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className={`relative z-10 w-full transition-all duration-300 ${activeTab === "super-admin" ? "max-w-2xl" : "max-w-lg"}`}>
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center animate-in fade-in-0 duration-300">
          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-primary/5 border border-primary/10 flex items-center justify-center mb-3 shadow-lg shadow-primary/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="DevBoard AI Logo" className="h-9 w-9 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {workspaces.length === 0 ? "Welcome to DevBoard AI" : "DevBoard AI Workspaces"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
            {workspaces.length === 0
              ? "Get started by creating a new workspace for your team or joining an existing one."
              : `Logged in as @${user.name || "User"}. Switch between your workspace teams below.`}
          </p>
        </div>

        {/* Tab Switcher (if workspaces exist) */}
        {workspaces.length > 0 && (
          <div className={`grid ${user.isSuperAdmin ? "grid-cols-4" : "grid-cols-3"} gap-2 bg-secondary/50 p-1.5 rounded-xl border border-border/85 mb-6 backdrop-blur-xs animate-in fade-in-0 duration-300`}>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "list"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              Teams List
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create New
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "join"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Join Code
            </button>
            {user.isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("super-admin")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "super-admin"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
                Admin Portal
              </button>
            )}
          </div>
        )}

        {/* Form Switcher (if NO workspaces exist) */}
        {workspaces.length === 0 && (
          <div className={`grid ${user.isSuperAdmin ? "grid-cols-3" : "grid-cols-2"} gap-2 bg-secondary/50 p-1.5 rounded-xl border border-border/85 mb-6 backdrop-blur-xs animate-in fade-in-0 duration-300`}>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create Workspace
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "join"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Join with Code
            </button>
            {user.isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("super-admin")}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "super-admin"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
                Admin Portal
              </button>
            )}
          </div>
        )}

        {/* Content Render */}
        <div className="animate-in fade-in-50 zoom-in-98 duration-200">
          {activeTab === "list" && workspaces.length > 0 && (
            <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Landmark className="h-4.5 w-4.5 text-primary" /> Active Workspaces
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Select a team workspace to enter your project dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  const isSwitching = isSwitchingId === ws.id;

                  return (
                    <div
                      key={ws.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                        isActive
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-secondary/10 hover:bg-secondary/20"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                          {ws.name}
                          {isActive && (
                            <Badge variant="success" className="text-[8px] h-4 px-1.5 font-bold shrink-0">
                              <Check className="h-2 w-2" /> ACTIVE
                            </Badge>
                          )}
                        </span>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                          {ws.description || "No description provided."}
                        </p>
                        <span className="text-[9px] text-muted-foreground/80 mt-1.5 block">
                          {ws.memberCount} members • Slug: {ws.slug}
                        </span>
                      </div>

                      {isActive ? (
                        <Button
                          onClick={() => router.push("/dashboard")}
                          className="sm:w-auto h-8 text-[10px] font-bold gap-1 shrink-0 self-end sm:self-auto"
                        >
                          Dashboard <ArrowRight className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          disabled={isSwitching || isSwitchingId !== null}
                          onClick={() => handleSwitchWorkspace(ws.id)}
                          className="sm:w-auto h-8 text-[10px] font-bold gap-1 shrink-0 self-end sm:self-auto cursor-pointer"
                        >
                          {isSwitching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              Enter <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-4 flex justify-between items-center text-xs text-muted-foreground">
                <span>Total workspaces: {workspaces.length}</span>
                <Button
                  variant="ghost"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="h-8 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer font-bold gap-1"
                >
                  <LogOut className="h-3 w-3" /> Sign Out
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === "create" && (
            <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xl">
              <form onSubmit={handleCreateWorkspace}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4.5 w-4.5 text-primary" /> Create a New Team
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Create a new space for your software products. You will be set as Owner/Admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ws-name" className="text-xs">Workspace Name</Label>
                    <Input
                      id="ws-name"
                      placeholder="e.g. Acme Studio, Alpha Devs"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      required
                      disabled={isCreating}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ws-desc" className="text-xs">Description (Optional)</Label>
                    <Textarea
                      id="ws-desc"
                      placeholder="Write a brief overview of what this team is working on..."
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                      disabled={isCreating}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="w-full h-10 font-bold gap-1 text-xs"
                  >
                    {isCreating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        Create Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                  {workspaces.length === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full h-9 text-[10px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer font-bold gap-1"
                    >
                      <LogOut className="h-3 w-3" /> Sign Out
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>
          )}

          {activeTab === "join" && (
            <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xl">
              <form onSubmit={handleJoinWorkspace}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="h-4.5 w-4.5 text-primary" /> Enter Invite Code
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Enter the active 8-character invite code to join a workspace team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-code" className="text-xs">Workspace Invite Code</Label>
                    <Input
                      id="invite-code"
                      placeholder="e.g. ABC123XYZ"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      required
                      maxLength={10}
                      disabled={isJoining}
                      className="h-12 text-center font-mono tracking-widest text-base placeholder:text-xs placeholder:tracking-normal"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    disabled={isJoining}
                    className="w-full h-10 font-bold gap-1 text-xs"
                  >
                    {isJoining ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        Join Team <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                  {workspaces.length === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full h-9 text-[10px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer font-bold gap-1"
                    >
                      <LogOut className="h-3 w-3" /> Sign Out
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>
          )}

          {activeTab === "super-admin" && user.isSuperAdmin && (
            <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xl w-full">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Shield className="h-4.5 w-4.5 text-yellow-500" /> Super Admin Portal
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      System-wide management of all workspaces and user accounts
                    </CardDescription>
                  </div>
                  {/* Inner tab switcher */}
                  <div className="flex gap-1 p-0.5 bg-secondary/60 rounded-lg border border-border/60 w-fit shrink-0">
                    <button
                      type="button"
                      onClick={() => setSuperAdminSubTab("workspaces")}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        superAdminSubTab === "workspaces"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Workspaces ({adminWorkspaces.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuperAdminSubTab("users")}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        superAdminSubTab === "users"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Users ({adminUsers.length})
                    </button>
                  </div>
                </div>
              </CardHeader>

              {/* Cockpit Stats Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-border/50 bg-secondary/15">
                {/* Users Stat */}
                <div className="p-3 rounded-xl border border-blue-500/10 bg-blue-500/5 text-blue-400">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Users className="h-3 w-3 text-blue-400" /> Total Users
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1">
                    {adminUsers.length}
                  </div>
                  <div className="text-[9px] text-muted-foreground/75 mt-0.5 truncate">
                    Admins: {adminUsers.filter((u) => u.isSuperAdmin).length}
                  </div>
                </div>

                {/* Workspaces Stat */}
                <div className="p-3 rounded-xl border border-purple-500/10 bg-purple-500/5 text-purple-400">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Landmark className="h-3 w-3 text-purple-400" /> Workspaces
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1">
                    {adminWorkspaces.length}
                  </div>
                  <div className="text-[9px] text-muted-foreground/75 mt-0.5 truncate">
                    Active spaces
                  </div>
                </div>

                {/* Average Team Size Stat */}
                <div className="p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-400">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Shield className="h-3 w-3 text-emerald-400" /> Avg Team Size
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1">
                    {adminWorkspaces.length > 0
                      ? (
                          adminWorkspaces.reduce((acc, ws) => acc + ws.memberCount, 0) /
                          adminWorkspaces.length
                        ).toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="text-[9px] text-muted-foreground/75 mt-0.5 truncate">
                    Members/workspace
                  </div>
                </div>

                {/* System Status Stat */}
                <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-400">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    <Sparkles className="h-3 w-3 text-amber-400" /> System Health
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1 flex items-center gap-1">
                    100%
                  </div>
                  <div className="text-[9px] text-muted-foreground/75 mt-0.5 truncate">
                    All services online
                  </div>
                </div>
              </div>

              <CardContent className="pt-4 space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {superAdminSubTab === "workspaces" ? (
                  adminWorkspaces.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No workspaces found in the database.
                    </div>
                  ) : (
                    adminWorkspaces.map((ws) => (
                      <div
                        key={ws.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/15 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {ws.name}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground block truncate mt-0.5">
                            Slug: {ws.slug} • ID: {ws.id}
                          </span>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                            {ws.description || "No description."}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[9px] text-muted-foreground/80">
                            <span>Created: {new Date(ws.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{ws.memberCount} members</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 truncate max-w-[180px]">
                              Owner: {ws.createdBy?.name || ws.createdBy?.githubUsername || "Unknown"}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actionLoadingId === ws.id}
                          onClick={() => handleSuperDeleteWorkspace(ws.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer shrink-0 self-end sm:self-auto"
                          title="Delete Workspace"
                        >
                          {actionLoadingId === ws.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))
                  )
                ) : (
                  adminUsers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No users found in the database.
                    </div>
                  ) : (
                    adminUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/15 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {u.githubAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.githubAvatarUrl}
                              alt=""
                              className="h-7 w-7 rounded-full border border-border shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {u.name ? u.name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : "?"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                              {u.name || "GitHub User"}
                              {u.isSuperAdmin && (
                                <Badge variant="warning" className="text-[8px] h-4 px-1.5 font-bold shrink-0">
                                  SUPER ADMIN
                                </Badge>
                              )}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground block truncate mt-0.5">
                              ID: {u.id}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[9px] text-muted-foreground/80">
                              {u.email && <span>{u.email}</span>}
                              {u.githubUsername && (
                                <>
                                  {u.email && <span>•</span>}
                                  <span>@{u.githubUsername}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoadingId === u.id}
                            onClick={() => handleSuperToggleAdmin(u.id)}
                            className="h-8 text-[9px] font-bold cursor-pointer"
                          >
                            {actionLoadingId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.isSuperAdmin ? (
                              "Demote Admin"
                            ) : (
                              "Promote Admin"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoadingId === u.id}
                            onClick={() => handleSuperDeleteUser(u.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                            title="Delete User Account"
                          >
                            {actionLoadingId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
