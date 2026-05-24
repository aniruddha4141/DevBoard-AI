"use client";

import * as React from "react";
import {
  updateTicket,
  deleteTicket,
  addComment,
  getComments,
} from "@/server/actions/ticket";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TicketType,
  TicketStatus,
  TicketPriority,
  WorkspaceRole,
} from "@prisma/client";
import {
  Loader2,
  Trash,
  MessageSquare,
  Calendar,
  User,
  Tag,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { canEditTicket, hasPermission } from "@/lib/permissions";

interface UserProfile {
  id: string;
  name: string | null;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
}

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  user: {
    name: string | null;
    githubUsername: string | null;
    githubAvatarUrl: string | null;
  };
}

interface TicketDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
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
  };
  members: UserProfile[];
  userRole: WorkspaceRole;
  currentUserId: string;
  onSuccess: () => void;
}

export function TicketDetailModal({
  open,
  onOpenChange,
  ticket,
  members,
  userRole,
  currentUserId,
  onSuccess,
}: TicketDetailModalProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(ticket.title);
  const [description, setDescription] = React.useState(ticket.description || "");
  const [type, setType] = React.useState<TicketType>(ticket.type);
  const [status, setStatus] = React.useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = React.useState<TicketPriority>(ticket.priority);
  const [assigneeId, setAssigneeId] = React.useState(ticket.assigneeId || "");
  const [dueDate, setDueDate] = React.useState(
    ticket.dueDate ? new Date(ticket.dueDate).toISOString().split("T")[0] : ""
  );

  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Comments states
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [isCommenting, setIsCommenting] = React.useState(false);

  // Check permissions
  const canModify = canEditTicket(userRole, currentUserId, ticket.assigneeId);
  const canDelete = hasPermission(userRole, "ticket:delete");

  // Load comments
  const loadComments = React.useCallback(async () => {
    try {
      const data = await getComments(ticket.id);
      setComments(data.map((c) => ({ ...c, createdAt: new Date(c.createdAt) })));
    } catch {
      toast.error("Failed to load comments");
    }
  }, [ticket.id]);

  React.useEffect(() => {
    if (open) {
      loadComments();
      setIsEditing(false);
      // Reset form states
      setTitle(ticket.title);
      setDescription(ticket.description || "");
      setType(ticket.type);
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setAssigneeId(ticket.assigneeId || "");
      setDueDate(
        ticket.dueDate ? new Date(ticket.dueDate).toISOString().split("T")[0] : ""
      );
    }
  }, [open, ticket, loadComments]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsUpdating(true);
    try {
      await updateTicket(ticket.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });

      toast.success("Ticket updated successfully!");
      setIsEditing(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    setIsDeleting(true);
    try {
      await deleteTicket(ticket.id);
      toast.success("Ticket deleted successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete ticket");
      setIsDeleting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsCommenting(true);
    try {
      const added = await addComment(ticket.id, newComment.trim());
      setComments((prev) => [...prev, { ...added, createdAt: new Date(added.createdAt) }]);
      setNewComment("");
      toast.success("Comment added!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit comment");
    } finally {
      setIsCommenting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        title={isEditing ? "Edit Ticket Details" : ""}
        className="max-w-2xl"
      >
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-0 duration-200">
            {/* Main Area: Details and Comments */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="uppercase text-[9px] py-0 px-2 font-bold tracking-wider">
                    {ticket.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Opened {formatDate(ticket.createdAt)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {ticket.title}
                </h2>
              </div>

              {/* Description */}
              <div className="space-y-1.5 border-t border-border pt-4">
                <span className="text-xs font-semibold text-muted-foreground">Description</span>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {ticket.description || "No description provided."}
                </p>
              </div>

              {/* Comments Section */}
              <div className="space-y-4 border-t border-border pt-4">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})
                </span>

                {/* Comment Form */}
                {hasPermission(userRole, "ticket:comment") && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input
                      placeholder="Add a comment on this ticket..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={isCommenting}
                      className="text-xs"
                    />
                    <Button type="submit" size="icon" disabled={isCommenting || !newComment.trim()}>
                      {isCommenting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </form>
                )}

                {/* Comment Feed */}
                <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5 text-xs bg-secondary/15 p-2.5 rounded-lg border border-border/30">
                      {comment.user.githubAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.user.githubAvatarUrl}
                          alt="Comment avatar"
                          className="h-6 w-6 rounded-full border border-border shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 mt-0.5">
                          ?
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {comment.user.githubUsername || comment.user.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: Metadata and Actions */}
            <div className="space-y-5 border-t md:border-t-0 md:border-l border-border pt-5 md:pt-0 md:pl-5">
              <div className="space-y-3.5">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Properties
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Status</span>
                  <div className="text-xs font-semibold text-foreground uppercase">
                    {ticket.status}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Priority</span>
                  <div className="text-xs font-semibold text-foreground uppercase">
                    {ticket.priority}
                  </div>
                </div>

                {/* Assignee */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground block">Assignee</span>
                  <div className="flex items-center gap-2">
                    {ticket.assignee ? (
                      <>
                        <Avatar className="h-5 w-5">
                          {ticket.assignee.githubAvatarUrl && (
                            <AvatarImage src={ticket.assignee.githubAvatarUrl} />
                          )}
                          <AvatarFallback className="text-[8px]">?</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-foreground truncate">
                          {ticket.assignee.name || ticket.assignee.githubUsername}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Unassigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground block">Due Date</span>
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 opacity-60" />
                    {ticket.dueDate ? formatDate(ticket.dueDate) : "No due date"}
                  </span>
                </div>

                {/* Reporter */}
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground block">Reporter</span>
                  <span className="text-xs text-foreground truncate block">
                    {ticket.reporter?.name || ticket.reporter?.githubUsername || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Actions Box */}
              {(canModify || canDelete) && (
                <div className="space-y-2 border-t border-border pt-4">
                  {canModify && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="w-full h-8.5 text-xs font-semibold"
                    >
                      Edit Ticket
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
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Trash className="h-3 w-3" /> Delete Ticket
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Editing Form */
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUpdating}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  id="edit-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as TicketType)}
                  disabled={isUpdating}
                >
                  <option value={TicketType.TASK}>Task</option>
                  <option value={TicketType.BUG}>Bug</option>
                  <option value={TicketType.FEATURE}>Feature</option>
                  <option value={TicketType.IMPROVEMENT}>Improvement</option>
                  <option value={TicketType.DOCUMENTATION}>Documentation</option>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  id="edit-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  disabled={isUpdating}
                >
                  <option value={TicketPriority.LOW}>Low</option>
                  <option value={TicketPriority.MEDIUM}>Medium</option>
                  <option value={TicketPriority.HIGH}>High</option>
                  <option value={TicketPriority.CRITICAL}>Critical</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-assignee">Assignee</Label>
                <Select
                  id="edit-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={isUpdating}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.githubUsername}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-duedate">Due Date</Label>
                <Input
                  id="edit-duedate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isUpdating}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                disabled={isUpdating}
              >
                <option value={TicketStatus.BACKLOG}>Backlog</option>
                <option value={TicketStatus.TODO}>Todo</option>
                <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                <option value={TicketStatus.REVIEW}>Review</option>
                <option value={TicketStatus.DONE}>Done</option>
                <option value={TicketStatus.CLOSED}>Closed</option>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
