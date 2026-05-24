"use client";

import * as React from "react";
import { updateWorkspace, removeMember } from "@/server/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import {
  Settings,
  Github,
  Globe,
  Loader2,
  Save,
  Trash2,
  ShieldAlert,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Play,
} from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";
import { getRoleColor, getRoleLabel } from "@/lib/permissions";
import { AI_PROVIDERS } from "@/lib/ai";

interface UserProfile {
  name: string | null;
  email: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
  githubProfileUrl: string | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  aiProvider?: string | null;
  aiApiKey?: string | null;
  aiApiUrl?: string | null;
  aiModel?: string | null;
}

interface SettingsPanelClientProps {
  user: UserProfile;
  workspace: Workspace;
  userRole: WorkspaceRole;
}

export function SettingsPanelClient({
  user,
  workspace: initialWorkspace,
  userRole,
}: SettingsPanelClientProps) {
  const [workspaceName, setWorkspaceName] = React.useState(initialWorkspace.name);
  const [workspaceDesc, setWorkspaceDesc] = React.useState(initialWorkspace.description || "");
  
  // Unified AI Config states
  const [aiProvider, setAiProvider] = React.useState(initialWorkspace.aiProvider || "google_gemini");
  const [aiApiKey, setAiApiKey] = React.useState(initialWorkspace.aiApiKey || "");
  const [aiApiUrl, setAiApiUrl] = React.useState(initialWorkspace.aiApiUrl || "");
  const [aiModel, setAiModel] = React.useState(initialWorkspace.aiModel || "");
  
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const isAdmin = userRole === "ADMIN";

  const handleProviderChange = (providerId: string) => {
    setAiProvider(providerId);
    const providerMeta = AI_PROVIDERS.find((p) => p.id === providerId);
    if (providerMeta) {
      setAiApiUrl(providerMeta.defaultUrl || "");
      setAiModel(providerMeta.defaultModel || "");
    } else {
      setAiApiUrl("");
      setAiModel("");
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!aiApiKey.trim()) {
      toast.error("Please enter an API Key to test the connection.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const { testWorkspaceAI } = await import("@/server/actions/workspace");
      const res = await testWorkspaceAI(
        initialWorkspace.id,
        aiProvider,
        aiApiKey.trim(),
        aiApiUrl.trim() || null,
        aiModel.trim() || null
      );
      setTestResult(res);
      if (res.success) {
        toast.success("AI connection test successful!");
      } else {
        toast.error(`AI connection test failed: ${res.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setTestResult({ success: false, message: msg });
      toast.error(`Connection failed: ${msg}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsUpdating(true);
    try {
      await updateWorkspace(initialWorkspace.id, {
        name: workspaceName.trim(),
        description: workspaceDesc.trim() || null,
        aiProvider,
        aiApiKey: aiApiKey.trim() || null,
        aiApiUrl: aiApiUrl.trim() || null,
        aiModel: aiModel.trim() || null,
      });
      toast.success("Workspace updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (
      !confirm(
        "CRITICAL: Are you absolutely sure you want to delete this workspace? This will delete all projects, tickets, bugs, and files. This action CANNOT be undone!"
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      // Import workspace delete action from workspace.ts
      const { deleteWorkspace } = await import("@/server/actions/workspace");
      await deleteWorkspace(initialWorkspace.id);
      
      toast.success("Workspace deleted successfully!");
      window.location.href = "/workspaces";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workspace");
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
      {/* 1. User GitHub Account Profile */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border border-border bg-card/45 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent" />
          <CardContent className="pt-20 pb-6 text-center flex flex-col items-center justify-center">
            {user.githubAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.githubAvatarUrl}
                alt="Profile avatar"
                className="h-20 w-20 rounded-full border border-border/80 shadow-lg relative z-10 bg-secondary"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary relative z-10 shrink-0">
                {user.name ? user.name[0].toUpperCase() : "D"}
              </div>
            )}

            <h3 className="text-base font-bold text-foreground mt-4">
              {user.name || user.githubUsername}
            </h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 justify-center">
              <Github className="h-3 w-3" /> @{user.githubUsername}
            </span>

            <Badge variant="outline" className={getRoleColor(userRole) + " mt-4 px-3 py-0.5 font-bold"}>
              {getRoleLabel(userRole)}
            </Badge>

            <div className="h-[1px] bg-border/60 w-full my-6" />

            <div className="w-full text-left space-y-3.5 text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Email Address</span>
                <span className="text-foreground truncate max-w-[150px] font-semibold">{user.email || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Profile Link</span>
                {user.githubProfileUrl ? (
                  <a
                    href={user.githubProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    GitHub Profile <Globe className="h-3 w-3" />
                  </a>
                ) : (
                  <span>N/A</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Workspace Management */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-primary" /> Workspace Settings
            </CardTitle>
            <CardDescription className="text-[10px]">
              Customize workspace meta configurations or edit descriptions
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateWorkspace}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Workspace Name</Label>
                <Input
                  id="ws-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  disabled={!isAdmin || isUpdating}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-slug">Workspace Slug</Label>
                <Input
                  id="ws-slug"
                  value={initialWorkspace.slug}
                  disabled
                  className="h-10 text-xs font-mono bg-secondary/15"
                />
                <span className="text-[9px] text-muted-foreground block pl-0.5">Slugs are generated automatically and cannot be changed.</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-desc">Description</Label>
                <Textarea
                  id="ws-desc"
                  value={workspaceDesc}
                  onChange={(e) => setWorkspaceDesc(e.target.value)}
                  disabled={!isAdmin || isUpdating}
                  rows={4}
                  className="text-xs"
                />
              </div>

              {/* AI Keys Section */}
              <div className="border-t border-border/40 my-4 pt-4 space-y-4">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-xs font-bold text-foreground">AI Integration Settings</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-provider">AI Provider</Label>
                    <Select
                      id="ai-provider"
                      value={aiProvider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      disabled={!isAdmin || isUpdating || isTesting}
                      className="text-xs h-10"
                    >
                      {AI_PROVIDERS.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ai-model">Model Name</Label>
                    <Input
                      id="ai-model"
                      placeholder="e.g. gpt-4o-mini"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      disabled={!isAdmin || isUpdating || isTesting}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ai-api-key">API Secret Token / Key</Label>
                  <Input
                    id="ai-api-key"
                    type="password"
                    placeholder="Enter API key or credential token..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    disabled={!isAdmin || isUpdating || isTesting}
                    className="h-10 text-xs font-mono"
                  />
                  <span className="text-[9px] text-muted-foreground block pl-0.5">
                    Workspace-specific credentials. Toggles default to server key if empty.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ai-api-url">API Endpoint Base URL</Label>
                  <Input
                    id="ai-api-url"
                    placeholder="e.g. https://api.openai.com/v1"
                    value={aiApiUrl}
                    onChange={(e) => setAiApiUrl(e.target.value)}
                    disabled={!isAdmin || isUpdating || isTesting}
                    className="h-10 text-xs font-mono"
                  />
                  <span className="text-[9px] text-muted-foreground block pl-0.5">
                    API Base URL for OpenAI-compatible providers, gateways, or local deployments (Ollama, vLLM).
                  </span>
                </div>

                {isAdmin && (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-secondary/15">
                    <div className="text-[10px] text-muted-foreground max-w-sm">
                      Validate connection parameters before saving keys to avoid request failures.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting || isUpdating || !aiApiKey.trim()}
                      className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      {isTesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> Test Connection
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {testResult && (
                  <div className={`p-3 rounded-lg border text-xs flex gap-2 items-start ${
                    testResult.success 
                      ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400" 
                      : "border-red-500/25 bg-red-500/5 text-red-400"
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {testResult.success ? "Connection Success" : "Connection Error"}
                      </span>
                      <p className="mt-0.5 leading-relaxed text-[10px] break-all">
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            {isAdmin && (
              <CardFooter className="border-t border-border pt-4 flex justify-end">
                <Button type="submit" disabled={isUpdating} className="h-9 font-semibold gap-1.5 text-xs">
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" /> Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </form>
        </Card>

        {/* 3. Danger Zone */}
        {isAdmin && (
          <Card className="border border-red-500/10 bg-red-950/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-500/15" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-red-500">
                <ShieldAlert className="h-4 w-4" /> Danger Zone
              </CardTitle>
              <CardDescription className="text-[10px]">
                High-risk operations that delete data permanently
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-xs text-foreground">Delete this workspace</span>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-md">
                  Once deleted, the workspace and all connected repository structures, tickets registry, and bug logs will be permanently deleted.
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteWorkspace}
                className="shrink-0 h-9 font-semibold gap-1.5 text-xs cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Delete Workspace
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
