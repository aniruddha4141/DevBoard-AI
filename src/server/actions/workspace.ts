"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug, generateInviteCode, generateToken } from "@/lib/utils";
import { WorkspaceRole, InviteStatus } from "@prisma/client";
import { hasPermission, canInviteWithRole } from "@/lib/permissions";
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

// Helper to check workspace membership and role
export async function getMemberRole(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    select: { role: true },
  });
  return member?.role || null;
}

// ============================================================
// WORKSPACE ACTIONS
// ============================================================

export async function createWorkspace(name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const baseSlug = generateSlug(name);
  
  // Ensure unique slug
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const workspace = await prisma.$transaction(async (tx) => {
    // 1. Create workspace (with automated invite code generation)
    const ws = await tx.workspace.create({
      data: {
        name,
        slug,
        description,
        createdById: userId,
        inviteCode: generateInviteCode(),
      },
    });

    // 2. Add creator as Admin member
    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId: ws.id,
        role: WorkspaceRole.ADMIN,
      },
    });

    return ws;
  });

  await logActivity(
    workspace.id,
    null,
    userId,
    "WORKSPACE_CREATED",
    `Created workspace "${name}"`
  );

  return workspace;
}

export async function getWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              githubUsername: true,
              githubAvatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWorkspace(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              githubUsername: true,
              githubAvatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!workspace) throw new Error("Workspace not found");

  const isMember = workspace.members.some((m) => m.userId === userId);
  if (!isMember) throw new Error("Access denied");

  return workspace;
}

// ============================================================
// INVITE ACTIONS
// ============================================================

export async function createInvite(
  workspaceId: string,
  invitedEmailOrUsername: string,
  role: WorkspaceRole
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);
  
  if (!userRole || !hasPermission(userRole, "workspace:invite")) {
    throw new Error("Permission denied to invite members");
  }

  if (!canInviteWithRole(userRole, role)) {
    throw new Error(`Your role does not allow inviting a member as ${role}`);
  }

  const isEmail = invitedEmailOrUsername.includes("@");
  const inviteCode = generateInviteCode();
  const inviteToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      invitedEmail: isEmail ? invitedEmailOrUsername : null,
      invitedGithubUsername: !isEmail ? invitedEmailOrUsername : null,
      inviteCode,
      inviteToken,
      role,
      invitedById: userId,
      expiresAt,
    },
  });

  await logActivity(
    workspaceId,
    null,
    userId,
    "MEMBER_INVITED",
    `Created invite for ${invitedEmailOrUsername} as ${role}`
  );

  return invite;
}

export async function joinWorkspaceWithCode(inviteCode: string) {
  return acceptInviteWithCode(inviteCode);
}

export async function removeMember(workspaceId: string, memberUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "workspace:remove_member")) {
    throw new Error("Permission denied to remove members");
  }

  // Cannot remove yourself (unless you're not the only admin, but let's restrict it to avoid lockouts)
  if (userId === memberUserId) {
    throw new Error("You cannot remove yourself from the workspace");
  }

  const memberToRemove = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
    include: { user: true },
  });

  if (!memberToRemove) throw new Error("Member not found");

  // Prevent removing other Admins unless you are the owner (workspace creator)
  if (memberToRemove.role === WorkspaceRole.ADMIN) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (ws?.createdById !== userId) {
      throw new Error("Only the workspace creator can remove other Admins");
    }
  }

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
  });

  await logActivity(
    workspaceId,
    null,
    userId,
    "MEMBER_REMOVED",
    `Removed member ${memberToRemove.user.githubUsername || memberToRemove.user.name || memberToRemove.user.email}`
  );

  revalidatePath(`/workspaces/${workspaceId}/team`);
}

export async function changeMemberRole(
  workspaceId: string,
  memberUserId: string,
  newRole: WorkspaceRole
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "workspace:change_role")) {
    throw new Error("Permission denied to change roles");
  }

  const memberToUpdate = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
    include: { user: true },
  });

  if (!memberToUpdate) throw new Error("Member not found");

  // Only creator can change other Admin roles
  if (memberToUpdate.role === WorkspaceRole.ADMIN || newRole === WorkspaceRole.ADMIN) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (ws?.createdById !== userId) {
      throw new Error("Only the workspace creator can change Admin roles");
    }
  }

  await prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId: memberUserId, workspaceId } },
    data: { role: newRole },
  });

  await logActivity(
    workspaceId,
    null,
    userId,
    "ROLE_CHANGED",
    `Changed role of ${memberToUpdate.user.githubUsername || memberToUpdate.user.name} to ${newRole}`
  );

  revalidatePath(`/workspaces/${workspaceId}/team`);
}

export async function updateWorkspace(
  workspaceId: string,
  data: {
    name: string;
    description: string | null;
    geminiApiKey?: string | null;
    openaiApiKey?: string | null;
    aiProvider?: string | null;
    aiApiKey?: string | null;
    aiApiUrl?: string | null;
    aiModel?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "workspace:edit")) {
    throw new Error("Permission denied to edit workspace");
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });

  await logActivity(
    workspaceId,
    null,
    userId,
    "WORKSPACE_UPDATED",
    `Updated workspace details for "${data.name}"`
  );

  return updated;
}

export async function testWorkspaceAI(
  workspaceId: string,
  provider: string,
  apiKey: string | null,
  apiUrl: string | null,
  model: string | null
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);
  if (!userRole || userRole !== WorkspaceRole.ADMIN) {
    throw new Error("Permission denied to test AI credentials");
  }

  if (!apiKey) {
    return { success: false, message: "API key is required to test connection." };
  }

  try {
    const { AI_PROVIDERS } = await import("@/lib/ai");
    const providerMeta = AI_PROVIDERS.find((p) => p.id === provider);
    const protocol = providerMeta?.protocol || "openai";
    const testPrompt = "Respond with exactly: 'Connected successfully.'";

    let responseText = "";

    if (protocol === "gemini") {
      const testModel = model || "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }],
            generationConfig: { maxOutputTokens: 20 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (protocol === "anthropic") {
      const cleanUrl = apiUrl ? `${apiUrl.replace(/\/$/, "")}/messages` : "https://api.anthropic.com/v1/messages";
      const res = await fetch(cleanUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-sonnet-latest",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 20,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      responseText = data.content?.[0]?.text || "";
    } else {
      // Default: openai protocol
      const cleanUrl = `${(apiUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
      const res = await fetch(cleanUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 20,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content || "";
    }

    if (responseText) {
      return { success: true, message: `Successfully connected! Response: "${responseText.trim()}"` };
    } else {
      return { success: false, message: "Connected, but received empty response." };
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed.",
    };
  }
}


export async function deleteWorkspace(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);

  if (!userRole || !hasPermission(userRole, "workspace:delete")) {
    throw new Error("Permission denied to delete workspace");
  }

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { createdById: true, name: true },
  });

  if (ws?.createdById !== userId) {
    throw new Error("Only the workspace creator can delete this workspace");
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  await logActivity(
    null,
    null,
    userId,
    "WORKSPACE_DELETED",
    `Deleted workspace "${ws.name}"`
  );
}

export async function acceptInviteWithTokenAction(inviteToken: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, githubUsername: true },
  });

  if (!dbUser) throw new Error("User record not found");

  const invite = await prisma.workspaceInvite.findUnique({
    where: { inviteToken },
    include: { workspace: true },
  });

  if (!invite || invite.status !== InviteStatus.PENDING) {
    throw new Error("Invalid or expired invite link");
  }

  if (invite.expiresAt < new Date()) {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new Error("Invite link has expired");
  }

  // Security checks:
  if (invite.invitedGithubUsername && dbUser.githubUsername) {
    if (invite.invitedGithubUsername.toLowerCase() !== dbUser.githubUsername.toLowerCase()) {
      throw new Error("This invite was sent to a different GitHub username");
    }
  }

  if (invite.invitedEmail && dbUser.email) {
    if (invite.invitedEmail.toLowerCase() !== dbUser.email.toLowerCase()) {
      throw new Error("This invite was sent to a different email address");
    }
  }

  // Join workspace
  await prisma.$transaction(async (tx) => {
    // 1. Add workspace member
    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId: invite.workspaceId,
        role: invite.role,
        invitedById: invite.invitedById,
      },
    });

    // 2. Accept invite
    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.ACCEPTED },
    });
  });

  await logActivity(
    invite.workspaceId,
    null,
    userId,
    "MEMBER_JOINED",
    `Joined workspace "${invite.workspace.name}" via invite link`
  );
}

export async function resetWorkspaceInvite(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = await getMemberRole(workspaceId, userId);
  if (!userRole || userRole !== WorkspaceRole.ADMIN) {
    throw new Error("Permission denied to reset invite link");
  }

  const newCode = generateInviteCode();
  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { inviteCode: newCode },
  });

  await logActivity(
    workspaceId,
    null,
    userId,
    "INVITE_RESET",
    `Reset invite link for workspace "${updated.name}"`
  );

  return updated;
}

export async function acceptInviteWithCode(inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const workspace = await prisma.workspace.findUnique({
    where: { inviteCode },
    include: { members: true },
  });

  if (!workspace) throw new Error("Invalid or expired invite link");

  // Check if already a member
  const existingMember = workspace.members.find((m) => m.userId === userId);
  if (existingMember) {
    return workspace;
  }

  // Add as developer role by default
  await prisma.workspaceMember.create({
    data: {
      userId,
      workspaceId: workspace.id,
      role: WorkspaceRole.DEVELOPER,
    },
  });

  await logActivity(
    workspace.id,
    null,
    userId,
    "MEMBER_JOINED",
    `Joined workspace "${workspace.name}" via invite code`
  );

  return workspace;
}


