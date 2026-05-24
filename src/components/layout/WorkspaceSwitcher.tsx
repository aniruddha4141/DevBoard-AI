"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setActiveWorkspaceId } from "@/server/actions/active-workspace";
import { Plus, Check, ChevronsUpDown, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleSwitch = async (id: string) => {
    try {
      await setActiveWorkspaceId(id);
      setIsOpen(false);
      toast.success(`Switched workspace`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to switch workspace");
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push("/workspaces");
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-11 px-3 rounded-lg border border-border bg-secondary/35 text-sm font-medium hover:bg-secondary/65 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="h-6 w-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Landmark className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-foreground">
            {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
          </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Transparent click overlay */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-lg border border-border bg-card shadow-lg p-1.5 max-h-56 overflow-y-auto animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
              Workspaces
            </div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer text-left",
                  ws.id === activeWorkspaceId && "text-foreground bg-secondary/40 font-semibold"
                )}
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === activeWorkspaceId && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}
            <div className="h-[1px] bg-border my-1.5" />
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-xs font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer text-left"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Workspace
            </button>
          </div>
        </>
      )}
    </div>
  );
}
