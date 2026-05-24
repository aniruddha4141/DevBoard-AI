"use client";

import * as React from "react";
import { createBugReport } from "@/server/actions/bug";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { BugSeverity } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Developer {
  id: string;
  name: string | null;
  githubUsername: string | null;
}

interface CreateBugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  developers: Developer[];
  onSuccess: () => void;
}

export function CreateBugModal({
  open,
  onOpenChange,
  projectId,
  developers,
  onSuccess,
}: CreateBugModalProps) {
  const [title, setTitle] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [component, setComponent] = React.useState("");
  const [severity, setSeverity] = React.useState<BugSeverity>(BugSeverity.MEDIUM);
  const [stepsToReproduce, setStepsToReproduce] = React.useState("");
  const [expectedResult, setExpectedResult] = React.useState("");
  const [actualResult, setActualResult] = React.useState("");
  const [assignedDeveloperId, setAssignedDeveloperId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Bug title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createBugReport({
        projectId,
        title: title.trim(),
        errorMessage: errorMessage.trim() || undefined,
        component: component.trim() || undefined,
        severity,
        stepsToReproduce: stepsToReproduce.trim() || undefined,
        expectedResult: expectedResult.trim() || undefined,
        actualResult: actualResult.trim() || undefined,
        assignedDeveloperId: assignedDeveloperId || null,
      });

      toast.success("Bug report created successfully!");
      
      // Reset
      setTitle("");
      setErrorMessage("");
      setComponent("");
      setSeverity(BugSeverity.MEDIUM);
      setStepsToReproduce("");
      setExpectedResult("");
      setActualResult("");
      setAssignedDeveloperId("");
      
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to report bug");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} title="Report a New Bug">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="bug-title">Bug Title</Label>
            <Input
              id="bug-title"
              placeholder="e.g. JWT Auth session validation fails"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bug-component">Component / Module</Label>
              <Input
                id="bug-component"
                placeholder="e.g. AuthMiddleware, Navbar"
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bug-severity">Severity</Label>
              <Select
                id="bug-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                disabled={isSubmitting}
              >
                <option value={BugSeverity.LOW}>Low</option>
                <option value={BugSeverity.MEDIUM}>Medium</option>
                <option value={BugSeverity.HIGH}>High</option>
                <option value={BugSeverity.CRITICAL}>Critical</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bug-err">Error / Exception Message (Optional)</Label>
            <Input
              id="bug-err"
              placeholder="e.g. TypeError: Cannot read property 'id' of null"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="bug-steps">Steps to Reproduce</Label>
            <Textarea
              id="bug-steps"
              placeholder="1. Go to settings page&#10;2. Click edit username&#10;3. Click save..."
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bug-expected">Expected Result</Label>
              <Textarea
                id="bug-expected"
                placeholder="Username updates correctly..."
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bug-actual">Actual Result</Label>
              <Textarea
                id="bug-actual"
                placeholder="Console logs uncaught type error..."
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bug-assignee">Assign Developer</Label>
            <Select
              id="bug-assignee"
              value={assignedDeveloperId}
              onChange={(e) => setAssignedDeveloperId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select Developer...</option>
              {developers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.githubUsername}
                </option>
              ))}
            </Select>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Report Bug"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
