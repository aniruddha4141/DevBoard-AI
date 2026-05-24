"use client";

import * as React from "react";
import { CreateBugModal } from "./CreateBugModal";
import { BugDetailModal } from "./BugDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, ShieldAlert, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { BugSeverity, BugStatus, WorkspaceRole } from "@prisma/client";
import { getBugReports } from "@/server/actions/bug";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";

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

interface BugsPanelClientProps {
  projectId: string;
  initialBugs: BugReport[];
  developers: UserProfile[];
  userRole: WorkspaceRole;
  currentUserId: string;
}

export function BugsPanelClient({
  projectId,
  initialBugs,
  developers,
  userRole,
  currentUserId,
}: BugsPanelClientProps) {
  const [bugs, setBugs] = React.useState<BugReport[]>(initialBugs);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [selectedBug, setSelectedBug] = React.useState<BugReport | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [severity, setSeverity] = React.useState("");

  const refreshBugs = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getBugReports(projectId);
      setBugs(
        data.map((b) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        }))
      );
    } catch {
      toast.error("Failed to sync bug database");
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId]);

  const filteredBugs = React.useMemo(() => {
    return bugs.filter((b) => {
      const matchesStatus = !status || b.status === status;
      const matchesSeverity = !severity || b.severity === severity;
      const matchesSearch =
        !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.component && b.component.toLowerCase().includes(search.toLowerCase()));

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [bugs, status, severity, search]);

  const canCreate = hasPermission(userRole, "bug:create");

  // Stats calculation
  const openCount = bugs.filter((b) => b.status === "OPEN").length;
  const investigatingCount = bugs.filter((b) => b.status === "INVESTIGATING").length;
  const fixedCount = bugs.filter((b) => b.status === "FIXED").length;

  const getSeverityBadge = (s: BugSeverity) => {
    switch (s) {
      case "CRITICAL":
        return <Badge variant="destructive" className="text-[9px] scale-95 font-bold">CRITICAL</Badge>;
      case "HIGH":
        return <Badge variant="destructive" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] scale-95 font-bold">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="warning" className="text-[9px] scale-95 font-bold">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px] scale-95 font-bold">LOW</Badge>;
    }
  };

  const getStatusBadge = (st: BugStatus) => {
    switch (st) {
      case "CLOSED":
        return <Badge variant="outline" className="text-slate-500 border-slate-500/20 text-[9px] scale-95">CLOSED</Badge>;
      case "FIXED":
        return <Badge variant="success" className="text-[9px] scale-95">FIXED</Badge>;
      case "INVESTIGATING":
        return <Badge variant="warning" className="text-[9px] scale-95">INVESTIGATING</Badge>;
      default:
        return <Badge variant="default" className="text-[9px] scale-95">OPEN</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bug Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card/45 p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Open Bugs</span>
            <div className="text-xl font-bold text-foreground mt-0.5">{openCount}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/45 p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Investigating</span>
            <div className="text-xl font-bold text-foreground mt-0.5">{investigatingCount}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/45 p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Resolved Fixed</span>
            <div className="text-xl font-bold text-foreground mt-0.5">{fixedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-card/25 border border-border/80 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-55" />
            <Input
              placeholder="Search by title or component..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-36 h-9 text-xs"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="FIXED">Fixed</option>
            <option value="CLOSED">Closed</option>
          </Select>

          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full sm:w-36 h-9 text-xs"
          >
            <option value="">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshBugs}
            disabled={isRefreshing}
            className="h-9 w-9 border border-border"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")} />
          </Button>

          {canCreate && (
            <Button
              onClick={() => setReportModalOpen(true)}
              className="h-9 px-4 font-semibold gap-1.5 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" /> Report Bug
            </Button>
          )}
        </div>
      </div>

      {/* Bugs List Grid */}
      {filteredBugs.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/10">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/35 mb-2.5" />
          <h4 className="text-xs font-semibold text-foreground">No bug reports match</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Active issue trackers are empty or all matching bugs resolved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBugs.map((bug) => (
            <Card
              key={bug.id}
              onClick={() => setSelectedBug(bug)}
              className="p-4 border border-border/80 bg-card/45 hover:bg-card/95 hover:border-primary/25 cursor-pointer transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between gap-4 mb-2.5">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(bug.severity)}
                  {getStatusBadge(bug.status)}
                </div>
                {bug.component && (
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase border border-border/40 px-1.5 py-0.5 rounded-sm bg-secondary/10">
                    {bug.component}
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {bug.title}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {bug.stepsToReproduce || "No reproduction steps provided."}
              </p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                <span>Opened: {new Date(bug.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">Assignee:</span>
                  {bug.assignedDeveloper ? (
                    <Avatar className="h-5 w-5">
                      {bug.assignedDeveloper.githubAvatarUrl && (
                        <AvatarImage src={bug.assignedDeveloper.githubAvatarUrl} />
                      )}
                      <AvatarFallback className="text-[8px]">?</AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-[9px] italic text-muted-foreground/80">Unassigned</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Report Bug Modal */}
      {reportModalOpen && (
        <CreateBugModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          projectId={projectId}
          developers={developers}
          onSuccess={refreshBugs}
        />
      )}

      {/* Bug Details Modal */}
      {selectedBug && (
        <BugDetailModal
          open={!!selectedBug}
          onOpenChange={(open) => !open && setSelectedBug(null)}
          bug={selectedBug}
          developers={developers}
          userRole={userRole}
          currentUserId={currentUserId}
          onSuccess={() => {
            setSelectedBug(null);
            refreshBugs();
          }}
        />
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
