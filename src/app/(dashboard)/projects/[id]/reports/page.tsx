import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { fetchAIReports } from "@/server/actions/report";
import { ReportsPanelClient } from "@/components/reports/ReportsPanelClient";
import { redirect } from "next/navigation";

interface ReportsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectReportsPage({ params }: ReportsPageProps) {
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

  // 2. Fetch user role in the workspace
  const userRole = await getMemberRole(project.workspaceId, session.user.id);
  if (!userRole) {
    redirect("/projects");
  }

  // 3. Fetch initial AI reports catalog
  const reports = await fetchAIReports(id);

  // Map reports database dates
  const serializedReports = reports.map((r) => ({
    id: r.id,
    reportType: r.reportType,
    title: r.title,
    content: r.content,
    createdAt: new Date(r.createdAt),
    generatedBy: {
      name: r.generatedBy.name,
      githubUsername: r.generatedBy.githubUsername,
    },
  }));

  return (
    <div className="animate-in fade-in-0 duration-300">
      <ReportsPanelClient
        projectId={id}
        initialReports={serializedReports}
        userRole={userRole}
      />
    </div>
  );
}
