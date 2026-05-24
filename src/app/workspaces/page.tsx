import { auth } from "@/lib/auth";
import { getWorkspaces } from "@/server/actions/workspace";
import { getActiveWorkspaceId } from "@/server/actions/active-workspace";
import { WorkspacesPanelClient } from "@/components/workspaces/WorkspacesPanelClient";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Workspaces | DevBoard AI",
  description: "Select or manage your DevBoard AI workspaces",
};

export default async function WorkspacesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, isSuperAdmin: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const rawWorkspaces = await getWorkspaces();
  const activeWorkspaceId = await getActiveWorkspaceId();

  // Map database workspaces structure to client component structure
  const workspaces = rawWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    description: ws.description,
    memberCount: ws.members.length,
  }));

  const userData = {
    name: dbUser.name || session.user.name || null,
    email: dbUser.email || session.user.email || null,
    image: dbUser.image || session.user.image || null,
    isSuperAdmin: dbUser.isSuperAdmin,
  };

  let superAdminWorkspaces: any[] | undefined = undefined;
  let superAdminUsers: any[] | undefined = undefined;

  if (dbUser.isSuperAdmin) {
    const allWorkspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            email: true,
            githubUsername: true,
          },
        },
        members: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    superAdminWorkspaces = allWorkspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
      createdAt: ws.createdAt.toISOString(),
      memberCount: ws.members.length,
      createdBy: {
        name: ws.createdBy?.name || null,
        email: ws.createdBy?.email || null,
        githubUsername: ws.createdBy?.githubUsername || null,
      },
    }));

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        githubUsername: true,
        githubAvatarUrl: true,
        isSuperAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    superAdminUsers = allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      githubUsername: u.githubUsername,
      githubAvatarUrl: u.githubAvatarUrl,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  return (
    <WorkspacesPanelClient
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      user={userData}
      superAdminWorkspaces={superAdminWorkspaces}
      superAdminUsers={superAdminUsers}
    />
  );
}
