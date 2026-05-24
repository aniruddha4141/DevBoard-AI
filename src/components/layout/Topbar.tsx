"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell, BellRing, Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/server/actions/notification";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export function Topbar() {
  const pathname = usePathname();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  // Fetch notifications
  const loadNotifications = React.useCallback(async () => {
    try {
      const data = await getNotifications();
      // Map Date string to Date object if needed, prisma returns serializable dates in client actions
      setNotifications(data.map((n) => ({ ...n, createdAt: new Date(n.createdAt) })));
    } catch {
      console.error("Failed to load notifications");
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      toast.success("Notification read");
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  // Generate breadcrumbs from path
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    return { label, href, isLast };
  });

  return (
    <header className="h-14 border-b border-border bg-card/65 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground">
        <span className="hover:text-foreground">Home</span>
        {breadcrumbs.map((bc, idx) => (
          <React.Fragment key={bc.href}>
            <span>/</span>
            {bc.isLast ? (
              <span className="text-foreground font-semibold truncate max-w-[150px]">
                {bc.label}
              </span>
            ) : (
              <span className="hover:text-foreground truncate max-w-[100px]">
                {bc.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right Tools: Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative h-8 w-8 rounded-full border border-border bg-secondary/30 flex items-center justify-center hover:bg-secondary/70 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-4 w-4 text-primary animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center border border-card shadow-sm">
                {unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </button>

        {isOpen && (
          <>
            {/* Backdrop click handler */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 z-50 w-80 rounded-xl border border-border bg-card shadow-xl p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                <span className="text-xs font-semibold text-foreground">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground/45 mb-2" />
                  <p className="text-xs font-medium text-muted-foreground">
                    All caught up!
                  </p>
                  <p className="text-[10px] text-muted-foreground/75 mt-0.5">
                    No new alerts or task assignments.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left cursor-pointer transition-colors text-xs relative",
                        n.isRead
                          ? "bg-transparent border-border/40 text-muted-foreground"
                          : "bg-secondary/45 border-border hover:bg-secondary/65 text-foreground"
                      )}
                    >
                      <div className="font-semibold truncate pr-4">{n.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </div>
                      {!n.isRead && (
                        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
