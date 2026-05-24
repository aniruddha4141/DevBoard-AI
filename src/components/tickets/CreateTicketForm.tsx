"use client";

import * as React from "react";
import { createTicket } from "@/server/actions/ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { TicketType, TicketStatus, TicketPriority } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string | null;
  githubUsername: string | null;
}

interface CreateTicketFormProps {
  projectId: string;
  members: Member[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateTicketForm({
  projectId,
  members,
  onSuccess,
  onCancel,
}: CreateTicketFormProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<TicketType>(TicketType.TASK);
  const [status, setStatus] = React.useState<TicketStatus>(TicketStatus.TODO);
  const [priority, setPriority] = React.useState<TicketPriority>(TicketPriority.MEDIUM);
  const [assigneeId, setAssigneeId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Ticket title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTicket({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });

      toast.success("Ticket created successfully!");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="ticket-title">Title</Label>
        <Input
          id="ticket-title"
          placeholder="e.g. Implement user login session"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="ticket-description">Description</Label>
        <Textarea
          id="ticket-description"
          placeholder="Describe the scope and requirements..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="ticket-type">Type</Label>
          <Select
            id="ticket-type"
            value={type}
            onChange={(e) => setType(e.target.value as TicketType)}
            disabled={isSubmitting}
          >
            <option value={TicketType.TASK}>Task</option>
            <option value={TicketType.BUG}>Bug</option>
            <option value={TicketType.FEATURE}>Feature</option>
            <option value={TicketType.IMPROVEMENT}>Improvement</option>
            <option value={TicketType.DOCUMENTATION}>Documentation</option>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ticket-priority">Priority</Label>
          <Select
            id="ticket-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            disabled={isSubmitting}
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
          <Label htmlFor="ticket-assignee">Assignee</Label>
          <Select
            id="ticket-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={isSubmitting}
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
          <Label htmlFor="ticket-duedate">Due Date</Label>
          <Input
            id="ticket-duedate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="ticket-status">Initial Status</Label>
        <Select
          id="ticket-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          disabled={isSubmitting}
        >
          <option value={TicketStatus.BACKLOG}>Backlog</option>
          <option value={TicketStatus.TODO}>Todo</option>
          <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
          <option value={TicketStatus.REVIEW}>Review</option>
          <option value={TicketStatus.DONE}>Done</option>
          <option value={TicketStatus.CLOSED}>Closed</option>
        </Select>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create Ticket"
          )}
        </Button>
      </div>
    </form>
  );
}
