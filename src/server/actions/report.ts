"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getMemberRole } from "./workspace";
import { generateReport } from "@/lib/ai";
import { revalidatePath } from "next/cache";

// Helper to log activity
async function logActivity(
  workspaceId: string | null,
  projectId: string | null,
  userId: string,
  action: string,
  description: string
) {
  await prisma.activityLog.create({
    data: {
      workspaceId,
      projectId,
      userId,
      action,
      description,
    },
  });
}

export async function generateAIReportAction({
  projectId,
  reportType,
}: {
  projectId: string;
  reportType: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  });

  if (!project) throw new Error("Project not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "report:generate")) {
    throw new Error("Permission denied to generate AI reports");
  }

  // 1. Gather project stats for context prompts
  const ticketCount = await prisma.ticket.count({ where: { projectId } });
  const completedTickets = await prisma.ticket.count({
    where: { projectId, status: { in: ["DONE", "CLOSED"] } },
  });
  const bugCount = await prisma.bugReport.count({
    where: { projectId, NOT: { status: "CLOSED" } },
  });
  const memberCount = await prisma.projectMember.count({ where: { projectId } });

  const recentLogs = await prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { description: true },
  });

  const recentActivity = recentLogs.map((l) => l.description);

  // 2. Call AI module
  const { content, isMock } = await generateReport(reportType, {
    projectName: project.name,
    ticketCount,
    completedTickets,
    bugCount,
    memberCount,
    recentActivity,
    deadline: project.deadline ? project.deadline.toLocaleDateString() : undefined,
  });

  // 3. Save report in database
  const title = `AI ${reportType.toUpperCase()} Report ${new Date().toLocaleDateString()}${isMock ? " (Mock)" : ""}`;
  const report = await prisma.aIReport.create({
    data: {
      projectId,
      reportType,
      title,
      content,
      generatedById: userId,
    },
  });

  await logActivity(
    project.workspaceId,
    projectId,
    userId,
    "AI_REPORT_GENERATED",
    `Generated AI report "${title}"`
  );

  revalidatePath(`/projects/${projectId}/reports`);
  return report;
}

export async function fetchAIReports(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.aIReport.findMany({
    where: { projectId },
    include: {
      generatedBy: {
        select: {
          name: true,
          githubUsername: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAIReport(reportId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await prisma.aIReport.findUnique({
    where: { id: reportId },
    include: { project: true },
  });

  if (!report) throw new Error("Report not found");

  const userId = session.user.id;
  const userRole = await getMemberRole(report.project.workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "report:delete")) {
    throw new Error("Permission denied to delete reports");
  }

  await prisma.aIReport.delete({
    where: { id: reportId },
  });

  await logActivity(
    report.project.workspaceId,
    report.projectId,
    userId,
    "AI_REPORT_DELETED",
    `Deleted AI report "${report.title}"`
  );

  revalidatePath(`/projects/${report.projectId}/reports`);
}
