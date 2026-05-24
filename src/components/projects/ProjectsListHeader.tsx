"use client";

import * as React from "react";
import { CreateProjectModal } from "./CreateProjectModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ProjectsListHeaderProps {
  canCreate: boolean;
}

export function ProjectsListHeader({ canCreate }: ProjectsListHeaderProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage workspace repositories, track active project scopes, and view code IDEs.
        </p>
      </div>

      {canCreate && (
        <>
          <Button
            onClick={() => setModalOpen(true)}
            className="h-9 px-4 font-semibold gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Project
          </Button>
          <CreateProjectModal open={modalOpen} onOpenChange={setModalOpen} />
        </>
      )}
    </div>
  );
}
