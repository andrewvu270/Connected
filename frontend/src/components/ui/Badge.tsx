import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    tone?: "neutral" | "primary" | "accent";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md border px-3 py-1 text-label uppercase",
                tone === "primary"
                    ? "border-primary/20 bg-primary-subtle text-primary"
                    : tone === "accent"
                        ? "border-accent/20 bg-accent/10 text-accent"
                        : "border-border bg-surface text-muted",
                className
            )}
            {...props}
        />
    );
}
