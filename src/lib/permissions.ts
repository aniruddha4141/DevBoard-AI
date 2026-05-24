import { WorkspaceRole } from "@prisma/client";

// ============================================================
// PERMISSION DEFINITIONS
// ============================================================

type Permission =
  | "workspace:create"
  | "workspace:edit"
  | "workspace:delete"
  | "workspace:invite"
  | "workspace:remove_member"
  | "workspace:change_role"
  | "project:create"
  | "project:edit"
  | "project:delete"
  | "project:assign_member"
  | "ticket:create"
  | "ticket:edit"
  | "ticket:delete"
  | "ticket:assign"
  | "ticket:change_status"
  | "ticket:comment"
  | "bug:create"
  | "bug:edit"
  | "bug:delete"
  | "bug:assign"
  | "bug:convert_to_ticket"
  | "ide:access"
  | "ide:edit"
  | "github:connect"
  | "github:commit"
  | "github:create_branch"
  | "github:create_pr"
  | "github:sync"
  | "report:generate"
  | "report:delete"
  | "settings:manage";

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  ADMIN: [
    "workspace:create",
    "workspace:edit",
    "workspace:delete",
    "workspace:invite",
    "workspace:remove_member",
    "workspace:change_role",
    "project:create",
    "project:edit",
    "project:delete",
    "project:assign_member",
    "ticket:create",
    "ticket:edit",
    "ticket:delete",
    "ticket:assign",
    "ticket:change_status",
    "ticket:comment",
    "bug:create",
    "bug:edit",
    "bug:delete",
    "bug:assign",
    "bug:convert_to_ticket",
    "ide:access",
    "ide:edit",
    "github:connect",
    "github:commit",
    "github:create_branch",
    "github:create_pr",
    "github:sync",
    "report:generate",
    "report:delete",
    "settings:manage",
  ],
  PROJECT_MANAGER: [
    "project:create",
    "project:edit",
    "project:assign_member",
    "workspace:invite",
    "ticket:create",
    "ticket:edit",
    "ticket:delete",
    "ticket:assign",
    "ticket:change_status",
    "ticket:comment",
    "bug:create",
    "bug:edit",
    "bug:assign",
    "bug:convert_to_ticket",
    "ide:access",
    "ide:edit",
    "github:connect",
    "github:commit",
    "github:create_branch",
    "github:create_pr",
    "github:sync",
    "report:generate",
    "report:delete",
  ],
  DEVELOPER: [
    "ticket:create",
    "ticket:edit",
    "ticket:change_status",
    "ticket:comment",
    "bug:create",
    "ide:access",
    "ide:edit",
    "github:commit",
    "github:sync",
    "report:generate",
  ],
  VIEWER: [],
};

// PM can only invite DEV and VIEWER roles
const PM_INVITABLE_ROLES: WorkspaceRole[] = ["DEVELOPER", "VIEWER"];

// ============================================================
// PERMISSION CHECKING FUNCTIONS
// ============================================================

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canInviteWithRole(
  inviterRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  if (inviterRole === "ADMIN") return true;
  if (inviterRole === "PROJECT_MANAGER") {
    return PM_INVITABLE_ROLES.includes(targetRole);
  }
  return false;
}

export function canChangeRole(
  changerRole: WorkspaceRole,
  _currentRole: WorkspaceRole,
  _newRole: WorkspaceRole
): boolean {
  // Only admins can change roles
  return changerRole === "ADMIN";
}

export function canEditTicket(
  role: WorkspaceRole,
  userId: string,
  assigneeId: string | null
): boolean {
  if (role === "ADMIN" || role === "PROJECT_MANAGER") return true;
  if (role === "DEVELOPER") return userId === assigneeId;
  return false;
}

export function canAccessIDE(role: WorkspaceRole): boolean {
  return hasPermission(role, "ide:access");
}

export function canCommitToGitHub(role: WorkspaceRole): boolean {
  return hasPermission(role, "github:commit");
}

export function getRoleLabel(role: WorkspaceRole): string {
  const labels: Record<WorkspaceRole, string> = {
    ADMIN: "Admin",
    PROJECT_MANAGER: "Project Manager",
    DEVELOPER: "Developer",
    VIEWER: "Viewer",
  };
  return labels[role];
}

export function getRoleColor(role: WorkspaceRole): string {
  const colors: Record<WorkspaceRole, string> = {
    ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
    PROJECT_MANAGER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    DEVELOPER: "bg-green-500/10 text-green-500 border-green-500/20",
    VIEWER: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return colors[role];
}

export { type Permission, type WorkspaceRole as RoleType };
