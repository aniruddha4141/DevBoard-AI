"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  Settings2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface User {
  name?: string | null;
  email?: string | null;
  githubUsername?: string | null;
  githubAvatarUrl?: string | null;
}

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  user: User;
}

export function Sidebar({ workspaces, activeWorkspaceId, user }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Team",
      href: "/team",
      icon: Users2,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings2,
    },
  ];

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 border-r border-border bg-card flex flex-col justify-between transition-all duration-300 z-30 shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-5 p-3">
        {/* Logo Header */}
        <div className="flex items-center justify-between h-9 px-1">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg overflow-hidden bg-primary/5 border border-primary/10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.png" alt="DevBoard AI Logo" className="h-5 w-5 object-contain" />
              </div>
              <span className="font-bold text-sm tracking-tight">
                DevBoard <span className="text-primary font-mono">AI</span>
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link
              href="/dashboard"
              className="h-7 w-7 rounded-lg overflow-hidden bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="DevBoard AI Logo" className="h-5 w-5 object-contain" />
            </Link>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 rounded border border-border bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Workspace Switcher */}
        {!isCollapsed ? (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        ) : (
          <div className="h-[1px] bg-border my-1" />
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:text-foreground hover:bg-secondary/40",
                  isActive
                    ? "bg-secondary text-foreground border border-border/80"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User / Bottom Section */}
      <div className="p-3 border-t border-border flex flex-col gap-3">
        {/* User Card */}
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "px-1"
          )}
        >
          {user.githubAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.githubAvatarUrl}
              alt={user.githubUsername || "User avatar"}
              className="h-8 w-8 rounded-full border border-border bg-secondary shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
          )}

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {user.name || user.githubUsername}
              </span>
              <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                <Github className="h-2.5 w-2.5 shrink-0" />
                {user.githubUsername}
              </span>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
