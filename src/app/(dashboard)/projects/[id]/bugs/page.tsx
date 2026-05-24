import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { getBugReports } from "@/server/actions/bug";
import { BugsPanelClient } from "@/components/bugs/BugsPanelClient";
import { redirect } from "next/navigation";

interface BugsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectBugsPage({ params }: BugsPageProps) {
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

  // 2. Fetch user workspace role
  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole) {
    redirect("/projects");
  }

  // 3. Fetch initial bug registry
  const bugs = await getBugReports(id);

  // Map dates for client components
  const serializedBugs = bugs.map((b) => ({
    ...b,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt),
  }));

  // Fetch developers list
  const developers = project.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    githubUsername: m.user.githubUsername,
    githubAvatarUrl: m.user.githubAvatarUrl,
  }));

  return (
    <div className="animate-in fade-in-0 duration-300">
      <BugsPanelClient
        projectId={id}
        initialBugs={serializedBugs}
        developers={developers}
        userRole={userRole}
        currentUserId={session.user.id}
      />
    </div>
  );
}
