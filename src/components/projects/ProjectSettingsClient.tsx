"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateProject, deleteProject } from "@/server/actions/project";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ProjectStatus } from "@prisma/client";
import { Loader2, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ProjectSettingsClientProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    deadline: Date | string | null;
    techStack: string[];
    repositoryLink: string | null;
  };
  canDelete?: boolean;
}

export function ProjectSettingsClient({ project, canDelete = false }: ProjectSettingsClientProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description || "");
  const [status, setStatus] = React.useState<ProjectStatus>(project.status);
  const [deadline, setDeadline] = React.useState(
    project.deadline
      ? new Date(project.deadline).toISOString().split("T")[0]
      : ""
  );
  const [techStackInput, setTechStackInput] = React.useState(project.techStack.join(", "));
  const [repoLink, setRepoLink] = React.useState(project.repositoryLink || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const techStack = techStackInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        deadline: deadline || null,
        techStack,
        repositoryLink: repoLink.trim() || undefined,
      });

      toast.success("Project updated successfully!");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete the project "${project.name}"? This will delete all its tickets, bugs, files, and logs. This action is permanent and CANNOT be undone!`
      )
    )
      return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted successfully");
      router.push("/projects");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer border-border/80 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-3.5 w-3.5" /> Settings
      </Button>

      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent onClose={() => setOpen(false)} title="Project Settings">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <Label htmlFor="edit-project-name">Project Name</Label>
                <Input
                  id="edit-project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting || isDeleting}
                />
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="edit-project-description">Description</Label>
                <Textarea
                  id="edit-project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <Label htmlFor="edit-project-status">Status</Label>
                  <Select
                    id="edit-project-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    disabled={isSubmitting || isDeleting}
                  >
                    <option value={ProjectStatus.PLANNING}>Planning</option>
                    <option value={ProjectStatus.ACTIVE}>Active</option>
                    <option value={ProjectStatus.ON_HOLD}>On Hold</option>
                    <option value={ProjectStatus.COMPLETED}>Completed</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-project-deadline">Deadline</Label>
                  <Input
                    id="edit-project-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={isSubmitting || isDeleting}
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="edit-project-tech-stack">Tech Stack (comma separated)</Label>
                <Input
                  id="edit-project-tech-stack"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                />
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="edit-project-repo">GitHub Repository URL (Optional)</Label>
                <Input
                  id="edit-project-repo"
                  value={repoLink}
                  onChange={(e) => setRepoLink(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmitting || isDeleting}
                    onClick={handleDelete}
                    className="h-9 px-3 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5 cursor-pointer"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" /> Delete Project
                      </>
                    )}
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting || isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isDeleting} className="font-semibold">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
