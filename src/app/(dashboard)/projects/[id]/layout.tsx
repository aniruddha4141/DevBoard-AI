import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { Badge } from "@/components/ui/badge";
import { getRoleColor, getRoleLabel } from "@/lib/permissions";
import Link from "next/link";
import { ProjectSubNav } from "./ProjectSubNav";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch project and check authorization
  let project;
  try {
    project = await getProject(id);
  } catch {
    redirect("/projects");
  }

  // 2. Fetch user role in the workspace
  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole) {
    redirect("/projects");
  }

  return (
    <div className="space-y-6">
      {/* Project Title and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            <Badge variant="outline" className={getRoleColor(userRole)}>
              {getRoleLabel(userRole)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {project.description || "No project description provided."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project.repositoryLink && (
            <a
              href={project.repositoryLink}
              target="_blank"
              rel="noreferrer"
              className="h-8.5 px-3 rounded-lg border border-border bg-secondary/35 text-xs font-semibold hover:bg-secondary/65 transition-colors cursor-pointer flex items-center gap-1.5 text-foreground"
            >
              GitHub Repo
            </a>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <ProjectSubNav projectId={id} />

      {/* Project Specific Panel Contents */}
      <div className="min-h-[50vh]">{children}</div>
    </div>
  );
}
