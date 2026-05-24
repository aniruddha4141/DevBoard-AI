import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveWorkspaceId } from "@/server/actions/active-workspace";
import { getMemberRole } from "@/server/actions/workspace";
import { getProjects } from "@/server/actions/project";
import { hasPermission } from "@/lib/permissions";
import { ProjectsListHeader } from "@/components/projects/ProjectsListHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { FolderGit2 } from "lucide-react";

export const metadata = {
  title: "Projects | DevBoard AI",
  description: "Manage workspace projects and repositories",
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) {
    redirect("/workspaces");
  }

  // 1. Check if user is allowed to create projects
  const role = await getMemberRole(workspaceId, session.user.id);
  if (!role) {
    redirect("/workspaces");
  }
  const canCreate = hasPermission(role, "project:create");

  // 2. Fetch projects
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <ProjectsListHeader canCreate={canCreate} />

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/10">
          <FolderGit2 className="h-10 w-10 text-muted-foreground/35 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No projects found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Start tracking progress by creating your first workspace project repository.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
