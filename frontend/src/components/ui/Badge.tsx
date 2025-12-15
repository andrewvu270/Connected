import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "primary" | "accent";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "primary"
          ? "border-primary/20 bg-primary/10 text-primary"
          : tone === "accent"
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-border bg-bg text-muted",
        className
      )}
      {...props}
    />
  );
}
