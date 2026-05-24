"use client";

import * as React from "react";
import { TicketStatus, TicketType, TicketPriority, WorkspaceRole } from "@prisma/client";
import { changeTicketStatus } from "@/server/actions/ticket";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TicketDetailModal } from "./TicketDetailModal";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
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
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: UserProfile | null;
  reporter?: { name: string | null; githubUsername: string | null } | null;
}

interface KanbanBoardProps {
  tickets: Ticket[];
  members: UserProfile[];
  userRole: WorkspaceRole;
  currentUserId: string;
  projectId: string;
  filters: {
    type: string;
    priority: string;
    assignee: string;
    search: string;
  };
  onRefresh: () => void;
}

export function KanbanBoard({
  tickets,
  members,
  userRole,
  currentUserId,
  projectId,
  filters,
  onRefresh,
}: KanbanBoardProps) {
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = React.useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Filtered tickets
  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      const matchesType = !filters.type || t.type === filters.type;
      const matchesPriority = !filters.priority || t.priority === filters.priority;
      const matchesAssignee =
        !filters.assignee ||
        (filters.assignee === "unassigned" && !t.assigneeId) ||
        t.assigneeId === filters.assignee;
      const matchesSearch =
        !filters.search ||
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(filters.search.toLowerCase()));

      return matchesType && matchesPriority && matchesAssignee && matchesSearch;
    });
  }, [tickets, filters]);

  // Kanban Columns
  const columns: { label: string; status: TicketStatus; color: string }[] = [
    { label: "Backlog", status: TicketStatus.BACKLOG, color: "border-gray-500/10 text-gray-400" },
    { label: "Todo", status: TicketStatus.TODO, color: "border-blue-500/10 text-blue-400" },
    { label: "In Progress", status: TicketStatus.IN_PROGRESS, color: "border-purple-500/10 text-purple-400" },
    { label: "Review", status: TicketStatus.REVIEW, color: "border-amber-500/10 text-amber-400" },
    { label: "Done", status: TicketStatus.DONE, color: "border-emerald-500/10 text-emerald-400" },
    { label: "Closed", status: TicketStatus.CLOSED, color: "border-slate-500/10 text-slate-500" },
  ];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    setDraggedOverColumn(status);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    setDraggedOverColumn(null);

    const ticketId = e.dataTransfer.getData("text/plain");
    if (!ticketId) return;

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (ticket.status === targetStatus) return;

    // Check permissions
    if (userRole === "DEVELOPER" && ticket.assigneeId !== currentUserId) {
      toast.error("Developers can only shift their own assigned tickets");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await changeTicketStatus(ticketId, targetStatus);
      toast.success(`Moved ticket to ${targetStatus}`);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to move ticket");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getPriorityColor = (p: TicketPriority) => {
    switch (p) {
      case "CRITICAL":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "HIGH":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="relative">
      {isUpdatingStatus && (
        <div className="absolute inset-0 bg-background/30 backdrop-blur-xs flex items-center justify-center z-40">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTickets = filteredTickets.filter((t) => t.status === col.status);
          const isDraggingOver = draggedOverColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-xl border border-border/80 bg-card/25 p-3 flex flex-col min-h-[450px] transition-all duration-200 ${
                isDraggingOver ? "bg-secondary/40 border-primary/30 ring-1 ring-primary/20 scale-[0.99]" : ""
              }`}
            >
              {/* Column Title */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/60">
                <span className="text-xs font-bold tracking-wide uppercase text-foreground">
                  {col.label}
                </span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                  {colTickets.length}
                </Badge>
              </div>

              {/* Tickets Stack */}
              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto no-scrollbar max-h-[70vh]">
                {colTickets.length === 0 ? (
                  <div className="flex-1 border border-dashed border-border/40 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-[10px] text-muted-foreground/60">Drop tickets here</span>
                  </div>
                ) : (
                  colTickets.map((t) => (
                    <Card
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => setSelectedTicket(t)}
                      className="p-3 border border-border/60 bg-card/45 hover:bg-card/95 hover:border-primary/30 transition-all duration-200 shadow-sm cursor-grab active:cursor-grabbing relative group overflow-hidden"
                    >
                      {/* Priority indicator bar */}
                      <div className="flex justify-between items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[9px] scale-90 origin-left py-0 px-1 border-border/40 bg-secondary/15">
                          {t.type}
                        </Badge>
                        <span className={`text-[8px] font-bold py-0 px-1 rounded-sm border uppercase ${getPriorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {t.dueDate ? formatDate(t.dueDate) : "No due date"}
                        </span>

                        {t.assignee ? (
                          <Avatar className="h-5.5 w-5.5 border">
                            {t.assignee.githubAvatarUrl && (
                              <AvatarImage src={t.assignee.githubAvatarUrl} />
                            )}
                            <AvatarFallback className="text-[8px]">
                              {t.assignee.name ? t.assignee.name[0] : "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5.5 w-5.5 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                            ?
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket Details modal */}
      {selectedTicket && (
        <TicketDetailModal
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          ticket={selectedTicket}
          members={members}
          userRole={userRole}
          currentUserId={currentUserId}
          onSuccess={() => {
            setSelectedTicket(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
