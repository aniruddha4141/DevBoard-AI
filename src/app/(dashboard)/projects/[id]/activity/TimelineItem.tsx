import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { GitCommit, Layers, Bug, UserPlus, ShieldAlert, Cpu } from "lucide-react";

interface Log {
  id: string;
  action: string;
  description: string;
  createdAt: Date;
  user: {
    name: string | null;
    githubUsername: string | null;
    githubAvatarUrl: string | null;
  };
}

export function TimelineItem({ log }: { log: Log }) {
  const getIcon = (action: string) => {
    switch (action) {
      case "GITHUB_CODE_COMMITTED":
        return <GitCommit className="h-3.5 w-3.5 text-indigo-400" />;
      case "TICKET_CREATED":
      case "TICKET_STATUS_CHANGED":
      case "TICKET_UPDATED":
        return <Layers className="h-3.5 w-3.5 text-blue-400" />;
      case "BUG_REPORTED":
      case "BUG_UPDATED":
        return <Bug className="h-3.5 w-3.5 text-red-400" />;
      case "PROJECT_MEMBER_ASSIGNED":
      case "PROJECT_MEMBER_REMOVED":
        return <UserPlus className="h-3.5 w-3.5 text-emerald-400" />;
      case "AI_REPORT_GENERATED":
        return <Cpu className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <ShieldAlert className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="relative">
      {/* Connector icon bullet node */}
      <span className="absolute -left-[35px] top-1.5 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
        {getIcon(log.action)}
      </span>

      <div className="flex gap-3 text-xs leading-relaxed">
        {log.user.githubAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={log.user.githubAvatarUrl}
            alt="User avatar"
            className="h-7 w-7 rounded-full border border-border shrink-0 mt-0.5"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
            ?
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-foreground">
            <span className="font-semibold text-foreground/90">
              {log.user.githubUsername || log.user.name}
            </span>{" "}
            {log.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 scale-95 origin-left">
              {log.action}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(log.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
