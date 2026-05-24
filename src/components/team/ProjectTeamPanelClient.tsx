"use client";

import * as React from "react";
import { assignMemberToProject, removeMemberFromProject } from "@/server/actions/project";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, UserMinus, Loader2, ShieldCheck } from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

interface ProjectMember {
  user: UserProfile;
}

interface ProjectTeamPanelClientProps {
  projectId: string;
  assignedMembers: ProjectMember[];
  unassignedMembers: UserProfile[];
  userRole: WorkspaceRole;
}

export function ProjectTeamPanelClient({
  projectId,
  assignedMembers: initialAssigned,
  unassignedMembers: initialUnassigned,
  userRole,
}: ProjectTeamPanelClientProps) {
  const [assigned, setAssigned] = React.useState<ProjectMember[]>(initialAssigned);
  const [unassigned, setUnassigned] = React.useState<UserProfile[]>(initialUnassigned);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isRemovingId, setIsRemovingId] = React.useState<string | null>(null);

  const canManage = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsAssigning(true);
    try {
      const result = await assignMemberToProject(projectId, selectedUserId);
      
      const newMember = {
        user: unassigned.find((u) => u.id === selectedUserId)!,
      };

      setAssigned((prev) => [...prev, newMember]);
      setUnassigned((prev) => prev.filter((u) => u.id !== selectedUserId));
      setSelectedUserId("");
      toast.success("Developer assigned to project!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign member");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this developer from the project?")) return;

    setIsRemovingId(userId);
    try {
      await removeMemberFromProject(projectId, userId);
      
      const removedMember = assigned.find((m) => m.user.id === userId)!;
      
      setAssigned((prev) => prev.filter((m) => m.user.id !== userId));
      setUnassigned((prev) => [...prev, removedMember.user]);
      toast.success("Developer removed from project");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
      {/* Assigned Developers List */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border border-border bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> Assigned Project Team
            </CardTitle>
            <CardDescription className="text-[10px]">
              Developers assigned to this specific repository and tickets scope
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assigned.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No developers assigned. Assign workspace members using the side panel.
              </div>
            ) : (
              assigned.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/15"
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
                        @{member.user.githubUsername}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(member.user.id)}
                      disabled={isRemovingId === member.user.id}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title="Remove from Project"
                    >
                      {isRemovingId === member.user.id ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side Assign Panel */}
      {canManage && (
        <div className="space-y-6">
          <Card className="border border-border bg-card/45">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-primary" /> Assign Member
              </CardTitle>
              <CardDescription className="text-[10px]">
                Add developer from workspace team to this project scope
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unassigned.length === 0 ? (
                <div className="py-6 flex items-center justify-center gap-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground text-center">
                  <ShieldCheck className="h-4 w-4 text-primary" /> All workspace members assigned!
                </div>
              ) : (
                <form onSubmit={handleAssign} className="space-y-4">
                  <div className="space-y-1.5">
                    <Select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      disabled={isAssigning}
                      className="text-xs"
                    >
                      <option value="">Select member...</option>
                      {unassigned.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.githubUsername} (@{u.githubUsername})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={isAssigning || !selectedUserId}
                    className="w-full h-9 font-semibold gap-1 text-xs cursor-pointer"
                  >
                    {isAssigning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Assign Member"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
