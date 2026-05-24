import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWorkspace } from "@/server/actions/active-workspace";
import { redirect } from "next/navigation";
import {
  Folder,
  Layers,
  Bug,
  CheckCircle2,
  Users,
  Calendar,
  Github,
  GitCommit,
  Terminal,
  FileSpreadsheet,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata = {
  title: "Dashboard | DevBoard AI",
  description: "DevBoard AI Workspace Dashboard and analytics",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspace();
  if (!workspace) {
    redirect("/workspaces");
  }

  const workspaceId = workspace.id;

  // 1. Projects Query
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true, name: true, status: true, deadline: true, techStack: true },
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;

  // 2. Tickets Query
  const tickets = await prisma.ticket.findMany({
    where: { project: { workspaceId } },
    select: { id: true, status: true, priority: true },
  });

  const openTickets = tickets.filter(
    (t) => t.status !== "DONE" && t.status !== "CLOSED"
  ).length;
  const completedTickets = tickets.filter(
    (t) => t.status === "DONE" || t.status === "CLOSED"
  ).length;

  // 3. Bugs Query
  const bugReports = await prisma.bugReport.findMany({
    where: { project: { workspaceId } },
    select: { id: true, status: true, severity: true },
  });

  const openBugs = bugReports.filter((b) => b.status === "OPEN").length;
  const criticalBugs = bugReports.filter(
    (b) => b.severity === "CRITICAL" && b.status !== "CLOSED"
  ).length;

  // 4. Team Members
  const memberCount = workspace.members.length;

  // 5. Connected Repositories
  const repositories = await prisma.gitHubRepository.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });

  // 6. Recent Activity Logs
  const activityLogs = await prisma.activityLog.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // 7. Recent Commits
  const commitLogs = await prisma.gitHubCommitLog.findMany({
    where: { repository: { workspaceId } },
    include: {
      user: {
        select: {
          name: true,
          githubUsername: true,
          githubAvatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // 8. Upcoming Deadlines (within next 14 days)
  const today = new Date();
  const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = projects
    .filter((p) => p.deadline && new Date(p.deadline) >= today && new Date(p.deadline) <= nextTwoWeeks)
    .map((p) => ({
      id: p.id,
      title: p.name,
      type: "PROJECT",
      dueDate: p.deadline!,
    }));

  // 9. Process Chart Data
  // Statuses list: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, CLOSED
  const ticketStatuses = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "CLOSED"];
  const ticketsByStatusData = ticketStatuses.map((status) => ({
    name: status,
    value: tickets.filter((t) => t.status === status).length,
  }));

  // Severities list: LOW, MEDIUM, HIGH, CRITICAL
  const bugSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const bugsBySeverityData = bugSeverities.map((sev) => ({
    name: sev,
    value: bugReports.filter((b) => b.severity === sev && b.status !== "CLOSED").length,
  }));

  // Team activity counts over the last 7 days
  const activityOverTimeData = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    
    // Count activities on this day
    const count = activityLogs.filter((log) => {
      const logDate = new Date(log.createdAt);
      return (
        logDate.getDate() === d.getDate() &&
        logDate.getMonth() === d.getMonth() &&
        logDate.getFullYear() === d.getFullYear()
      );
    }).length;

    return { day: dayName, count };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {workspace.name} Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            SaaS development analytics, active repository syncs, and issue tickets.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/projects">
            <button className="h-8.5 px-3 rounded-lg border border-border bg-secondary/40 text-xs font-semibold hover:bg-secondary/70 transition-colors cursor-pointer text-foreground">
              Manage Projects
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1 */}
        <div className="rounded-xl border border-border bg-card/45 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Projects</span>
            <Folder className="h-4 w-4 text-primary opacity-75" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-foreground">{totalProjects}</div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{activeProjects} active sprints</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-border bg-card/45 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Open Tickets</span>
            <Layers className="h-4 w-4 text-blue-500 opacity-75" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-foreground">{openTickets}</div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{completedTickets} completed</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-border bg-card/45 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Bugs Active</span>
            <Bug className="h-4 w-4 text-red-500 opacity-75" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-foreground">{openBugs}</div>
            <p className="text-[9px] text-red-500 font-semibold mt-0.5">{criticalBugs} critical priority</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-xl border border-border bg-card/45 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Team Size</span>
            <Users className="h-4 w-4 text-emerald-500 opacity-75" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-foreground">{memberCount}</div>
            <p className="text-[9px] text-muted-foreground mt-0.5">Active workspace roles</p>
          </div>
        </div>

        {/* Card 5 */}
        <div className="rounded-xl border border-border bg-card/45 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Linked Repos</span>
            <Github className="h-4 w-4 text-foreground/80 opacity-75" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-foreground">{repositories.length}</div>
            <p className="text-[9px] text-muted-foreground mt-0.5">Imported git repositories</p>
          </div>
        </div>

        {/* Card 6 */}
        <div className="rounded-xl border border-border bg-card/45 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">PRs Merged</span>
            <GitCommit className="h-4 w-4 text-indigo-500 opacity-75" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-foreground">{commitLogs.length}</div>
            <p className="text-[9px] text-muted-foreground mt-0.5">Recorded commits</p>
          </div>
        </div>
      </div>

      {/* Recharts Analytics Panel */}
      <DashboardCharts
        ticketsByStatus={ticketsByStatusData}
        bugsBySeverity={bugsBySeverityData}
        activityOverTime={activityOverTimeData}
      />

      {/* Grid: Lower Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Widget: Recent Activity */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Activity Logs</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Audit trail of actions across this workspace
            </p>
          </div>
          <div className="mt-4 space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {activityLogs.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <Terminal className="h-8 w-8 text-muted-foreground/35 mb-2" />
                <span className="text-xs text-muted-foreground">No activity recorded yet</span>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs leading-relaxed">
                  {log.user.githubAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={log.user.githubAvatarUrl}
                      alt="User avatar"
                      className="h-7 w-7 rounded-full border border-border shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                      {log.user.name ? log.user.name[0].toUpperCase() : "D"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">
                      <span className="font-semibold">{log.user.githubUsername || log.user.name}</span>{" "}
                      {log.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] py-0.5 scale-95 origin-left tracking-wide">
                        {log.action}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Widget: Deadlines & Repos */}
        <div className="space-y-6">
          {/* Deadlines Widget */}
          <div className="rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> Upcoming Deadlines
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Project delivery milestones in the next 14 days
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted-foreground">No deadlines in the next 14 days</span>
                </div>
              ) : (
                upcomingDeadlines.map((dl) => (
                  <div key={dl.id} className="flex justify-between items-center text-xs p-2 rounded-lg border border-border/60 bg-secondary/25">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold truncate text-foreground">{dl.title}</div>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{dl.type}</span>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-[10px]">
                      {formatDate(dl.dueDate)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connected GitHub Repos Widget */}
          <div className="rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Github className="h-4 w-4 text-foreground/90" /> Connected Repositories
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Git repositories linked to projects
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {repositories.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted-foreground">No repositories linked</span>
                </div>
              ) : (
                repositories.map((repo) => (
                  <div key={repo.id} className="flex justify-between items-center text-xs p-2 rounded-lg border border-border/60 bg-secondary/25">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold truncate text-foreground">{repo.fullName}</div>
                      <span className="text-[9px] text-muted-foreground">Default: {repo.defaultBranch}</span>
                    </div>
                    <Badge variant="success" className="shrink-0 text-[9px] tracking-wide">
                      SYNCED
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
