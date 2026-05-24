import { auth } from "@/lib/auth";
import { getActiveWorkspace } from "@/server/actions/active-workspace";
import { getMemberRole } from "@/server/actions/workspace";
import { WorkspaceTeamPanelClient } from "@/components/team/WorkspaceTeamPanelClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Workspace Team | DevBoard AI",
  description: "Manage workspace members and permissions",
};

export default async function WorkspaceTeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Fetch active workspace details
  const workspace = await getActiveWorkspace();
  if (!workspace) {
    redirect("/workspaces");
  }

  // 2. Fetch logged in user's role in the active workspace
  const userRole = await getMemberRole(workspace.id, session.user.id);
  if (!userRole) {
    redirect("/workspaces");
  }

  // Map dates in members list
  const serializedMembers = workspace.members.map((m) => ({
    id: m.id,
    role: m.role,
    joinedAt: new Date(m.joinedAt),
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      githubUsername: m.user.githubUsername,
      githubAvatarUrl: m.user.githubAvatarUrl,
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace Team</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Invite developers and manage roles inside the {workspace.name} workspace context.
        </p>
      </div>

      <div className="animate-in fade-in-0 duration-300">
        <WorkspaceTeamPanelClient
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          members={serializedMembers}
          userRole={userRole}
          currentUserId={session.user.id}
          inviteCode={workspace.inviteCode || ""}
        />
      </div>
    </div>
  );
}
