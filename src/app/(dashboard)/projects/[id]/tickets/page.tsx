import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { getTickets } from "@/server/actions/ticket";
import { TicketsPanelClient } from "@/components/tickets/TicketsPanelClient";
import { redirect } from "next/navigation";

interface TicketsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectTicketsPage({ params }: TicketsPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch project details
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

  // 3. Fetch initial ticket registry
  const tickets = await getTickets(id);

  // Map database dates to JS Date objects for client props
  const serializedTickets = tickets.map((t) => ({
    ...t,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    dueDate: t.dueDate ? new Date(t.dueDate) : null,
  }));

  // Fetch project members list
  const members = project.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    githubUsername: m.user.githubUsername,
    githubAvatarUrl: m.user.githubAvatarUrl,
  }));

  return (
    <div className="animate-in fade-in-0 duration-300">
      <TicketsPanelClient
        projectId={id}
        initialTickets={serializedTickets}
        members={members}
        userRole={userRole}
        currentUserId={session.user.id}
      />
    </div>
  );
}
