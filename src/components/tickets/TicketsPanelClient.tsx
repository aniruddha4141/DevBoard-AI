"use client";

import * as React from "react";
import { KanbanBoard } from "./KanbanBoard";
import { CreateTicketForm } from "./CreateTicketForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Search, Filter, Grid, List, RefreshCw } from "lucide-react";
import { TicketType, TicketPriority, WorkspaceRole } from "@prisma/client";
import { getTickets } from "@/server/actions/ticket";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  type: TicketType;
  status: any; // TicketStatus
  priority: TicketPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: UserProfile | null;
  reporter?: { name: string | null; githubUsername: string | null } | null;
}

interface TicketsPanelClientProps {
  projectId: string;
  initialTickets: Ticket[];
  members: UserProfile[];
  userRole: WorkspaceRole;
  currentUserId: string;
}

export function TicketsPanelClient({
  projectId,
  initialTickets,
  members,
  userRole,
  currentUserId,
}: TicketsPanelClientProps) {
  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Filters
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [assignee, setAssignee] = React.useState("");

  const refreshTickets = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getTickets(projectId);
      setTickets(
        data.map((t) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
        }))
      );
    } catch {
      toast.error("Failed to sync ticket registry");
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId]);

  const canCreate = hasPermission(userRole, "ticket:create");

  return (
    <div className="space-y-4">
      {/* Header and Filter Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-card/25 border border-border/80 p-4 rounded-xl">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-55" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full sm:w-36 h-9 text-xs"
          >
            <option value="">All Types</option>
            <option value="TASK">Task</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
            <option value="IMPROVEMENT">Improvement</option>
            <option value="DOCUMENTATION">Documentation</option>
          </Select>

          {/* Priority Filter */}
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full sm:w-36 h-9 text-xs"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>

          {/* Assignee Filter */}
          <Select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full sm:w-40 h-9 text-xs"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.githubUsername}
              </option>
            ))}
          </Select>
        </div>

        {/* Sync & Create Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshTickets}
            disabled={isRefreshing}
            className="h-9 w-9 border border-border"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")} />
          </Button>

          {canCreate && (
            <>
              <Button
                onClick={() => setModalOpen(true)}
                className="h-9 px-4 font-semibold gap-1.5 cursor-pointer text-xs"
              >
                <Plus className="h-4 w-4" /> Create Ticket
              </Button>
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent
                  onClose={() => setModalOpen(false)}
                  title="Create New Sprint Ticket"
                >
                  <CreateTicketForm
                    projectId={projectId}
                    members={members}
                    onSuccess={() => {
                      setModalOpen(false);
                      refreshTickets();
                    }}
                    onCancel={() => setModalOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Kanban Board Display */}
      <KanbanBoard
        tickets={tickets}
        members={members}
        userRole={userRole}
        currentUserId={currentUserId}
        projectId={projectId}
        filters={{ type, priority, assignee, search }}
        onRefresh={refreshTickets}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";
