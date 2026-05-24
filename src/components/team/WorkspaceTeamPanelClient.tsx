"use client";

import * as React from "react";
import {
  createInvite,
  removeMember,
  changeMemberRole,
} from "@/server/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  CheckCircle,
  Copy,
  Landmark,
  Megaphone,
} from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import { getRoleColor, getRoleLabel } from "@/lib/permissions";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: UserProfile;
}

interface WorkspaceTeamPanelClientProps {
  workspaceId: string;
  workspaceName: string;
  members: WorkspaceMember[];
  userRole: WorkspaceRole;
  currentUserId: string;
  inviteCode: string;
}

export function WorkspaceTeamPanelClient({
  workspaceId,
  workspaceName,
  members: initialMembers,
  userRole,
  currentUserId,
  inviteCode,
}: WorkspaceTeamPanelClientProps) {
  const [members, setMembers] = React.useState<WorkspaceMember[]>(initialMembers);
  const [isUpdatingId, setIsUpdatingId] = React.useState<string | null>(null);

  // Tabs states
  const [activeTab, setActiveTab] = React.useState<"members" | "broadcast">("members");

  // Invite states
  const [currentInviteCode, setCurrentInviteCode] = React.useState(inviteCode);
  const [isResetting, setIsResetting] = React.useState(false);

  // Broadcast states
  const [broadcastTitle, setBroadcastTitle] = React.useState("");
  const [broadcastMessage, setBroadcastMessage] = React.useState("");
  const [broadcastType, setBroadcastType] = React.useState("INFO");
  const [isBroadcasting, setIsBroadcasting] = React.useState(false);

  const isAdmin = userRole === "ADMIN";
  const canInvite = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  const handleRoleChange = async (memberUserId: string, newRole: WorkspaceRole) => {
    setIsUpdatingId(memberUserId);
    try {
      await changeMemberRole(workspaceId, memberUserId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.user.id === memberUserId ? { ...m, role: newRole } : m))
      );
      toast.success("Role updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm("Are you sure you want to remove this member from the workspace?")) return;

    setIsUpdatingId(memberUserId);
    try {
      await removeMember(workspaceId, memberUserId);
      setMembers((prev) => prev.filter((m) => m.user.id !== memberUserId));
      toast.success("Member removed from workspace");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleResetInvite = async () => {
    if (!confirm("Are you sure you want to reset the invite link? The old link/code will stop working immediately.")) return;
    setIsResetting(true);
    try {
      const { resetWorkspaceInvite } = await import("@/server/actions/workspace");
      const updatedWs = await resetWorkspaceInvite(workspaceId);
      setCurrentInviteCode(updatedWs.inviteCode || "");
      toast.success("Workspace invite link reset successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset invite link");
    } finally {
      setIsResetting(false);
    }
  };

  const copyInviteUrl = () => {
    const inviteUrl = `${window.location.origin}/invite/${currentInviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied!");
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(currentInviteCode);
    toast.success("Invite code copied!");
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setIsBroadcasting(true);
    try {
      const { sendWorkspaceNotification } = await import("@/server/actions/notification");
      await sendWorkspaceNotification(workspaceId, broadcastTitle.trim(), broadcastMessage.trim(), broadcastType);
      toast.success("Broadcast notification sent to all members!");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab switcher for members/broadcast */}
      {canInvite && (
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl border border-border/80 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "members"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Team Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("broadcast")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "broadcast"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" /> Broadcast Announcement
          </button>
        </div>
      )}

      {activeTab === "members" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
          {/* Workspace Members list */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-border bg-card/45">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" /> Workspace Members
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Active developers and administrators in the {workspaceName} workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg border border-border bg-secondary/15"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border shrink-0">
                        {member.user.githubAvatarUrl && (
                          <AvatarImage src={member.user.githubAvatarUrl} />
                        )}
                        <AvatarFallback>
                          {member.user.name ? member.user.name[0] : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {member.user.name || member.user.githubUsername}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          @{member.user.githubUsername} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Role dropdown and options */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {isAdmin && member.user.id !== currentUserId ? (
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user.id, e.target.value as WorkspaceRole)}
                          disabled={isUpdatingId === member.user.id}
                          className="text-[11px] h-8 w-32 px-2"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="PROJECT_MANAGER">Project Manager</option>
                          <option value="DEVELOPER">Developer</option>
                          <option value="VIEWER">Viewer</option>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={getRoleColor(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      )}

                      {isAdmin && member.user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.user.id)}
                          disabled={isUpdatingId === member.user.id}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          title="Remove from Workspace"
                        >
                          {isUpdatingId === member.user.id ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Invitation controls */}
          <div className="space-y-6">
            {canInvite && (
              <Card className="border border-border bg-card/45 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-purple-500/10 to-transparent" />
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-primary" /> Workspace Invitation
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Share the secure invite link or code to onboard developers as Developers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentInviteCode ? (
                    <div className="space-y-4">
                      {/* Invite URL */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Invite Link</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${currentInviteCode}`}
                            className="h-9 text-xs font-mono bg-secondary/15 select-all"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={copyInviteUrl}
                            className="h-9 w-9 shrink-0 border-border cursor-pointer"
                            title="Copy Link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Invite Code */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Invite Code</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={currentInviteCode}
                            className="h-9 text-xs font-mono font-bold tracking-widest text-center bg-secondary/15 select-all"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={copyInviteCode}
                            className="h-9 w-9 shrink-0 border-border cursor-pointer"
                            title="Copy Code"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Warnings and Resets */}
                      <div className="p-3 rounded-lg border border-yellow-500/10 bg-yellow-500/5 text-yellow-500 text-[10px] leading-relaxed">
                        ⚠️ <strong>Security Notice:</strong> Anyone with this link or code can join this workspace as a <strong>Developer</strong>. Only one invite per workspace remains active. Resetting will invalidate the current URL.
                      </div>

                      {isAdmin && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetInvite}
                          disabled={isResetting}
                          className="w-full h-9 font-semibold text-xs gap-1.5 cursor-pointer border-destructive/20 text-destructive hover:bg-destructive/10"
                        >
                          {isResetting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Reset Invite Link & Code"
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No active invite code. Contact your Admin to generate one.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl animate-in fade-in-0 duration-300">
          <Card className="border border-border bg-card/45 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/25 via-purple-500/10 to-transparent" />
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Megaphone className="h-4.5 w-4.5 text-primary animate-pulse" /> Broadcast Workspace Notification
              </CardTitle>
              <CardDescription className="text-[10px]">
                Send a custom, real-time workspace broadcast notification to all members of {workspaceName}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSendBroadcast}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-title">Notification Title</Label>
                  <Input
                    id="broadcast-title"
                    placeholder="e.g. Critical System Maintenance, Sprint Wrap-up"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    required
                    disabled={isBroadcasting}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-type">Severity / Type</Label>
                  <Select
                    id="broadcast-type"
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                    disabled={isBroadcasting}
                    className="text-xs h-10 animate-none"
                  >
                    <option value="INFO">Information (Blue)</option>
                    <option value="SUCCESS">Success (Green)</option>
                    <option value="WARNING">Warning (Yellow)</option>
                    <option value="ERROR">Alert / Critical (Red)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-message">Notification Message</Label>
                  <Textarea
                    id="broadcast-message"
                    placeholder="Type the message body here... Keep it concise and informative."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                    disabled={isBroadcasting}
                    rows={5}
                    className="text-xs"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  {isBroadcasting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Megaphone className="h-3.5 w-3.5" /> Broadcast to All Members
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
