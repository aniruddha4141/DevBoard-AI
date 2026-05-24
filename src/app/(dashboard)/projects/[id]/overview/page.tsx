import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { ProjectSettingsClient } from "@/components/projects/ProjectSettingsClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Tag, Github, Users, ListTodo, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectOverviewPage({ params }: OverviewPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let project;
  try {
    project = await getProject(id);
  } catch {
    redirect("/projects");
  }

  const role = await getMemberRole(project.workspaceId, session.user.id);
  const canEdit = role === "ADMIN" || role === "PROJECT_MANAGER";
  const canDelete = role === "ADMIN";

  // Count tickets and bugs
  const ticketsCount = await prisma.ticket.count({ where: { projectId: id } });
  const openTicketsCount = await prisma.ticket.count({
    where: { projectId: id, NOT: { status: { in: ["DONE", "CLOSED"] } } },
  });

  const bugsCount = await prisma.bugReport.count({ where: { projectId: id } });
  const openBugsCount = await prisma.bugReport.count({
    where: { projectId: id, NOT: { status: "CLOSED" } },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
      {/* Left 2 Columns: Project details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Project Description card */}
        <Card className="border border-border/80 bg-card/45">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">About Project</CardTitle>
            {canEdit && (
              <ProjectSettingsClient project={project} canDelete={canDelete} />
            )}
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {project.description || "No project description provided."}
          </CardContent>
        </Card>

        {/* Tech Stack Card */}
        <Card className="border border-border/80 bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-primary" /> Technology Stack
            </CardTitle>
            <CardDescription className="text-[10px]">
              Core languages, frameworks, and libraries assigned to this repository
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.techStack.length === 0 ? (
              <span className="text-xs text-muted-foreground">No technologies specified.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs py-1 px-3">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Git Repo sync status */}
        <Card className="border border-border/80 bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Github className="h-4 w-4" /> GitHub Repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.repositories.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No repository connected. Go to the{" "}
                <Link href={`/projects/${id}/github`} className="text-primary hover:underline">
                  GitHub
                </Link>{" "}
                tab to link an OAuth repository.
              </div>
            ) : (
              project.repositories.map((repo) => (
                <div key={repo.id} className="flex justify-between items-center text-xs p-3 rounded-lg border border-border bg-secondary/25">
                  <div className="min-w-0 pr-3">
                    <span className="font-bold text-foreground block truncate">{repo.fullName}</span>
                    <span className="text-[10px] text-muted-foreground">Default Branch: {repo.defaultBranch}</span>
                  </div>
                  <Badge variant="success" className="text-[10px] font-semibold px-2 py-0.5 tracking-wide">
                    CONNECTED
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Status info, Team info */}
      <div className="space-y-6">
        {/* Status card */}
        <Card className="border border-border/80 bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Project Status</span>
              <Badge>{project.status}</Badge>
            </div>

            {/* Deadline */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Target Deadline</span>
              <span className="font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {project.deadline ? formatDate(project.deadline) : "Not set"}
              </span>
            </div>

            {/* Created At */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Started On</span>
              <span>{formatDate(project.createdAt)}</span>
            </div>

            <div className="h-[1px] bg-border/60" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/15 border border-border/40 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1">
                  <ListTodo className="h-3 w-3 text-blue-500" /> Tickets
                </span>
                <span className="text-lg font-bold text-foreground mt-1.5 block">
                  {openTicketsCount}/{ticketsCount}
                </span>
                <span className="text-[9px] text-muted-foreground">open remaining</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/15 border border-border/40 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-red-500" /> Bugs
                </span>
                <span className="text-lg font-bold text-foreground mt-1.5 block">
                  {openBugsCount}/{bugsCount}
                </span>
                <span className="text-[9px] text-muted-foreground">active reports</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Team Members */}
        <Card className="border border-border/80 bg-card/45">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Assigned Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.members.length === 0 ? (
              <span className="text-xs text-muted-foreground">No developers assigned yet.</span>
            ) : (
              project.members.map((member, idx) => {
                const u = member.user;
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-xs">
                    <Avatar className="h-7 w-7 border shrink-0">
                      {u.githubAvatarUrl ? (
                        <AvatarImage src={u.githubAvatarUrl} />
                      ) : (
                        <AvatarFallback className="text-[10px]">
                          {u.name ? u.name[0] : "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground block truncate">
                        {u.name || u.githubUsername}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        @{u.githubUsername}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inline imports since we use prisma in count query
import { prisma } from "@/lib/prisma";
import Link from "next/link";
