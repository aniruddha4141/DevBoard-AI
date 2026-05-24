import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80":
            variant === "secondary",
          "border-transparent bg-destructive/10 text-destructive border-destructive/20":
            variant === "destructive",
          "text-foreground border-border": variant === "outline",
          "border-transparent bg-emerald-500/10 text-emerald-500 border-emerald-500/20":
            variant === "success",
          "border-transparent bg-amber-500/10 text-amber-500 border-amber-500/20":
            variant === "warning",
          "border-transparent bg-sky-500/10 text-sky-500 border-sky-500/20":
            variant === "info",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
