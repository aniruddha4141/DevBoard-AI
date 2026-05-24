"use client";

import * as React from "react";
import {
  updateBugReport,
  deleteBugReport,
  convertBugToTicket,
} from "@/server/actions/bug";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BugSeverity, BugStatus, WorkspaceRole } from "@prisma/client";
import {
  Loader2,
  Trash,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Play,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

interface UserProfile {
  id: string;
  name: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

interface BugReport {
  id: string;
  title: string;
  errorMessage: string | null;
  component: string | null;
  severity: BugSeverity;
  status: BugStatus;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  screenshotUrl: string | null;
  assignedDeveloperId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  assignedDeveloper?: UserProfile | null;
  createdBy?: { name: string | null; githubUsername: string | null } | null;
}

interface BugDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bug: BugReport;
  developers: UserProfile[];
  userRole: WorkspaceRole;
  currentUserId: string;
  onSuccess: () => void;
}

export function BugDetailModal({
  open,
  onOpenChange,
  bug,
  developers,
  userRole,
  currentUserId,
  onSuccess,
}: BugDetailModalProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isConverting, setIsConverting] = React.useState(false);

  // Form edit states
  const [status, setStatus] = React.useState<BugStatus>(bug.status);
  const [severity, setSeverity] = React.useState<BugSeverity>(bug.severity);
  const [assignedDeveloperId, setAssignedDeveloperId] = React.useState(
    bug.assignedDeveloperId || ""
  );

  React.useEffect(() => {
    if (open) {
      setStatus(bug.status);
      setSeverity(bug.severity);
      setAssignedDeveloperId(bug.assignedDeveloperId || "");
    }
  }, [open, bug]);

  // Check permissions
  const canModify =
    userRole === "ADMIN" ||
    userRole === "PROJECT_MANAGER" ||
    (userRole === "DEVELOPER" && bug.assignedDeveloperId === currentUserId);

  const canDelete = hasPermission(userRole, "bug:delete");
  const canConvert = hasPermission(userRole, "bug:convert_to_ticket");

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateBugReport(bug.id, {
        status,
        severity,
        assignedDeveloperId: assignedDeveloperId || null,
      });
      toast.success("Bug report details updated!");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update bug report");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this bug report?")) return;

    setIsDeleting(true);
    try {
      await deleteBugReport(bug.id);
      toast.success("Bug report deleted!");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bug report");
      setIsDeleting(false);
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const ticket = await convertBugToTicket(bug.id);
      toast.success(`Converted to Ticket: ${ticket.title}`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to convert bug");
    } finally {
      setIsConverting(false);
    }
  };

  const getSeverityBadge = (s: BugSeverity) => {
    switch (s) {
      case "CRITICAL":
        return <Badge variant="destructive">CRITICAL</Badge>;
      case "HIGH":
        return <Badge variant="destructive" className="bg-orange-500/10 text-orange-500 border-orange-500/20">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary">LOW</Badge>;
    }
  };

  const getStatusBadge = (st: BugStatus) => {
    switch (st) {
      case "CLOSED":
        return <Badge variant="outline" className="text-slate-500 border-slate-500/20">CLOSED</Badge>;
      case "FIXED":
        return <Badge variant="success">FIXED</Badge>;
      case "INVESTIGATING":
        return <Badge variant="warning">INVESTIGATING</Badge>;
      default:
        return <Badge variant="default">OPEN</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-0 duration-200">
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getSeverityBadge(bug.severity)}
                {getStatusBadge(bug.status)}
                <span className="text-[10px] text-muted-foreground">
                  Reported {formatDate(bug.createdAt)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {bug.title}
              </h2>
              {bug.component && (
                <div className="text-[11px] font-semibold text-muted-foreground mt-1">
                  Component: <span className="text-foreground">{bug.component}</span>
                </div>
              )}
            </div>

            {/* Error Message Stack */}
            {bug.errorMessage && (
              <div className="space-y-1.5 border-t border-border pt-4">
                <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Exception Error Message
                </span>
                <pre className="text-[10px] font-mono bg-red-950/20 border border-red-500/10 p-3 rounded-lg overflow-x-auto text-red-400">
                  {bug.errorMessage}
                </pre>
              </div>
            )}

            {/* Reproduction steps */}
            {bug.stepsToReproduce && (
              <div className="space-y-1.5 border-t border-border pt-4">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" /> Steps to Reproduce
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pl-1">
                  {bug.stepsToReproduce}
                </p>
              </div>
            )}

            {/* Results expected vs actual */}
            {(bug.expectedResult || bug.actualResult) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                {bug.expectedResult && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Expected
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">
                      {bug.expectedResult}
                    </p>
                  </div>
                )}
                {bug.actualResult && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Actual
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">
                      {bug.actualResult}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Settings Panel */}
          <div className="space-y-5 border-t md:border-t-0 md:border-l border-border pt-5 md:pt-0 md:pl-5">
            <div className="space-y-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Bug Controls
              </div>

              {/* Edit status if permitted */}
              {canModify ? (
                <div className="space-y-3.5">
                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <Label htmlFor="bug-status-select" className="text-[10px] text-muted-foreground">Status</Label>
                    <Select
                      id="bug-status-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as BugStatus)}
                      className="text-xs h-8"
                    >
                      <option value="OPEN">Open</option>
                      <option value="INVESTIGATING">Investigating</option>
                      <option value="FIXED">Fixed</option>
                      <option value="CLOSED">Closed</option>
                    </Select>
                  </div>

                  {/* Severity Dropdown */}
                  <div className="space-y-1">
                    <Label htmlFor="bug-sev-select" className="text-[10px] text-muted-foreground">Severity</Label>
                    <Select
                      id="bug-sev-select"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                      className="text-xs h-8"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </Select>
                  </div>

                  {/* Assign Developer */}
                  <div className="space-y-1">
                    <Label htmlFor="bug-dev-select" className="text-[10px] text-muted-foreground">Assign Developer</Label>
                    <Select
                      id="bug-dev-select"
                      value={assignedDeveloperId}
                      onChange={(e) => setAssignedDeveloperId(e.target.value)}
                      className="text-xs h-8"
                    >
                      <option value="">Unassigned</option>
                      {developers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.githubUsername}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="w-full h-8 text-xs font-semibold mt-2"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply Changes"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Assignee</span>
                    {bug.assignedDeveloper ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          {bug.assignedDeveloper.githubAvatarUrl && (
                            <AvatarImage src={bug.assignedDeveloper.githubAvatarUrl} />
                          )}
                          <AvatarFallback className="text-[8px]">?</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-foreground truncate">
                          {bug.assignedDeveloper.name || bug.assignedDeveloper.githubUsername}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Reporter</span>
                    <span className="text-xs text-foreground block">
                      {bug.createdBy?.name || bug.createdBy?.githubUsername || "Unknown"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Conversion / Deletion actions */}
            {(canConvert || canDelete) && (
              <div className="space-y-2 border-t border-border pt-4">
                {canConvert && (
                  <Button
                    variant="outline"
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="w-full h-8.5 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    {isConverting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <ArrowUpRight className="h-3.5 w-3.5 text-primary" /> Convert to Ticket
                      </>
                    )}
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full h-8.5 text-xs font-semibold gap-1.5"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash className="h-3.5 w-3.5" /> Delete Report
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
