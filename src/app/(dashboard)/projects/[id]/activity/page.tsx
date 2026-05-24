import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TimelineItem } from "./TimelineItem";
import { Terminal } from "lucide-react";

interface ActivityPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectActivityPage({ params }: ActivityPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch project
  let project;
  try {
    project = await getProject(id);
  } catch {
    redirect("/projects");
  }

  // 2. Fetch project activity logs
  const logs = await prisma.activityLog.findMany({
    where: { projectId: id },
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
    take: 50,
  });

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div>
        <h2 className="text-sm font-bold text-foreground">Project Activity Log</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Real-time timeline of git pushes, ticket updates, and workspace audits
        </p>
      </div>

      <div className="border border-border/80 bg-card/45 p-6 rounded-xl relative max-w-3xl">
        {logs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Terminal className="h-8 w-8 text-muted-foreground/35 mb-2" />
            <span className="text-xs text-muted-foreground">No logs recorded for this project yet.</span>
          </div>
        ) : (
          <div className="relative pl-6 border-l border-border space-y-6">
            {logs.map((log) => (
              <TimelineItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
