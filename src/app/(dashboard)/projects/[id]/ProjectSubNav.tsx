"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  Layers,
  Bug,
  Terminal,
  Github,
  Sparkles,
  Users,
  History,
} from "lucide-react";

interface ProjectSubNavProps {
  projectId: string;
}

export function ProjectSubNav({ projectId }: ProjectSubNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Overview",
      href: `/projects/${projectId}/overview`,
      icon: FileText,
    },
    {
      name: "Tickets",
      href: `/projects/${projectId}/tickets`,
      icon: Layers,
    },
    {
      name: "Bugs",
      href: `/projects/${projectId}/bugs`,
      icon: Bug,
    },
    {
      name: "IDE",
      href: `/projects/${projectId}/ide`,
      icon: Terminal,
    },
    {
      name: "GitHub",
      href: `/projects/${projectId}/github`,
      icon: Github,
    },
    {
      name: "AI Reports",
      href: `/projects/${projectId}/reports`,
      icon: Sparkles,
    },
    {
      name: "Team",
      href: `/projects/${projectId}/team`,
      icon: Users,
    },
    {
      name: "Activity",
      href: `/projects/${projectId}/activity`,
      icon: History,
    },
  ];

  return (
    <div className="flex border-b border-border overflow-x-auto no-scrollbar scroll-smooth">
      <nav className="flex space-x-1 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors hover:text-foreground",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
