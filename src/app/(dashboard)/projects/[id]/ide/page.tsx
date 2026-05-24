import { auth } from "@/lib/auth";
import { getProject } from "@/server/actions/project";
import { getMemberRole } from "@/server/actions/workspace";
import { getIDEFiles } from "@/server/actions/ide";
import { IDELayout } from "@/components/ide/IDELayout";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

interface IDEPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectIDEPage({ params }: IDEPageProps) {
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
  if (!userRole || !hasPermission(userRole, "ide:access")) {
    redirect(`/projects/${id}/overview`);
  }

  // 3. Fetch files registry from database
  const files = await getIDEFiles(id);

  // Map files database properties for serialization
  const serializedFiles = files.map((f) => ({
    id: f.id,
    path: f.path,
    fileName: f.fileName,
    language: f.language,
    content: f.content,
    status: f.status,
  }));

  return (
    <div className="animate-in fade-in-0 duration-300">
      <IDELayout
        projectId={id}
        initialFiles={serializedFiles}
        userRole={userRole}
      />
    </div>
  );
}
