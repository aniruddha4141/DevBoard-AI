import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Folder, Calendar, Github, Code, CheckSquare } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ProjectStatus } from "@prisma/client";

interface ProjectMember {
  user: {
    name: string | null;
    githubUsername: string | null;
    githubAvatarUrl: string | null;
  };
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    deadline: Date | string | null;
    techStack: string[];
    repositoryLink: string | null;
    members: ProjectMember[];
    tickets: { id: string; status: string }[];
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const openTickets = project.tickets.filter(
    (t) => t.status !== "DONE" && t.status !== "CLOSED"
  ).length;

  const totalTickets = project.tickets.length;
  const progressPercent = totalTickets
    ? Math.round(((totalTickets - openTickets) / totalTickets) * 100)
    : 0;

  const getStatusBadgeVariant = (status: ProjectStatus) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "ON_HOLD":
        return "warning";
      case "COMPLETED":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Card className="border border-border/80 bg-card/45 hover:bg-card/75 transition-all duration-300 shadow-sm relative overflow-hidden group">
      {/* Dynamic left color indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <Badge variant={getStatusBadgeVariant(project.status)}>
            {project.status}
          </Badge>
          {project.repositoryLink && (
            <a
              href={project.repositoryLink}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Github className="h-4 w-4" />
            </a>
          )}
        </div>
        <CardTitle className="text-base font-bold text-foreground mt-2 group-hover:text-primary transition-colors">
          <Link href={`/projects/${project.id}/overview`} className="block">
            {project.name}
          </Link>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {project.description || "No description provided."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" /> Progress
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tech Stack Tags */}
        <div className="flex flex-wrap gap-1">
          {project.techStack.slice(0, 4).map((tech) => (
            <Badge
              key={tech}
              variant="outline"
              className="text-[9px] py-0 px-1.5 font-medium border-border/60 bg-secondary/15"
            >
              {tech}
            </Badge>
          ))}
          {project.techStack.length > 4 && (
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-medium">
              +{project.techStack.length - 4} more
            </Badge>
          )}
        </div>

        <div className="h-[1px] bg-border/60" />

        {/* Card Footer Info */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {project.deadline ? formatDate(project.deadline) : "No deadline"}
          </span>

          {/* Members Avatars List */}
          <div className="flex -space-x-1.5 overflow-hidden">
            {project.members.slice(0, 4).map((m, idx) => {
              const u = m.user;
              return (
                <Avatar key={idx} className="h-6 w-6 border border-card ring-1 ring-border/20 shrink-0">
                  {u.githubAvatarUrl ? (
                    <AvatarImage src={u.githubAvatarUrl} />
                  ) : (
                    <AvatarFallback className="text-[8px]">
                      {u.name ? u.name[0] : "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
              );
            })}
            {project.members.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-muted border border-card flex items-center justify-center text-[8px] font-semibold text-muted-foreground shrink-0">
                +{project.members.length - 4}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
