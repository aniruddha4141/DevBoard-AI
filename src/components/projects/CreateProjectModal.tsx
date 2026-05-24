"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/server/actions/project";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ProjectStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [deadline, setDeadline] = React.useState("");
  const [techStackInput, setTechStackInput] = React.useState("");
  const [repoLink, setRepoLink] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Split comma separated tech stack
      const techStack = techStackInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        deadline: deadline || null,
        techStack,
        repositoryLink: repoLink.trim() || undefined,
      });

      toast.success(`Project "${name}" created successfully!`);
      
      // Reset form
      setName("");
      setDescription("");
      setStatus(ProjectStatus.PLANNING);
      setDeadline("");
      setTechStackInput("");
      setRepoLink("");
      
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g. API Gateway, Core Engine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="Describe the goals and scope of this project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="project-status">Status</Label>
              <Select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                disabled={isSubmitting}
              >
                <option value={ProjectStatus.PLANNING}>Planning</option>
                <option value={ProjectStatus.ACTIVE}>Active</option>
                <option value={ProjectStatus.ON_HOLD}>On Hold</option>
                <option value={ProjectStatus.COMPLETED}>Completed</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="project-deadline">Deadline</Label>
              <Input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-tech-stack">Tech Stack (comma separated)</Label>
            <Input
              id="project-tech-stack"
              placeholder="e.g. Next.js, PostgreSQL, TypeScript, Stripe"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-repo">GitHub Repository URL (Optional)</Label>
            <Input
              id="project-repo"
              placeholder="e.g. https://github.com/org/repo"
              value={repoLink}
              onChange={(e) => setRepoLink(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-semibold">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
