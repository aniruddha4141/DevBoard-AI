import { auth } from "@/lib/auth";
import { getActiveWorkspace } from "@/server/actions/active-workspace";
import { getMemberRole } from "@/server/actions/workspace";
import { SettingsPanelClient } from "@/components/settings/SettingsPanelClient";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings | DevBoard AI",
  description: "Customize user profile settings and workspace configurations",
};

export default async function SettingsPage() {
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

  // 3. Fetch logged in user account details
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      githubUsername: true,
      githubAvatarUrl: true,
      githubProfileUrl: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const workspaceData = {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    geminiApiKey: workspace.geminiApiKey,
    openaiApiKey: workspace.openaiApiKey,
    aiProvider: workspace.aiProvider,
    aiApiKey: workspace.aiApiKey,
    aiApiUrl: workspace.aiApiUrl,
    aiModel: workspace.aiModel,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customize active workspace meta and review user profile connection details.
        </p>
      </div>

      <div className="animate-in fade-in-0 duration-300">
        <SettingsPanelClient
          user={dbUser}
          workspace={workspaceData}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
