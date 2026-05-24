import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { getActiveWorkspaceId } from "@/server/actions/active-workspace";
import { TutorialTour } from "./TutorialTour";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutWrapperProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch user's workspaces
  const userMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const workspaces = userMemberships.map((m) => m.workspace);

  // 2. If no workspaces, redirect to workspaces landing page
  if (workspaces.length === 0) {
    redirect("/workspaces");
  }

  // 3. Get active workspace ID
  const activeWorkspaceId = await getActiveWorkspaceId();
  if (!activeWorkspaceId) {
    redirect("/workspaces");
  }

  // Ensure user has details
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      githubUsername: true,
      githubAvatarUrl: true,
    },
  });

  const sidebarUser = {
    name: dbUser?.name || session.user.name || "Developer",
    email: dbUser?.email || session.user.email || "",
    githubUsername: dbUser?.githubUsername || (session.user as Record<string, unknown>).githubUsername as string || "",
    githubAvatarUrl: dbUser?.githubAvatarUrl || session.user.image || "",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <TutorialTour />
      {/* Sidebar Navigation */}
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        user={sidebarUser}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
