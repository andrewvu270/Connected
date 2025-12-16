import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md";
};

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                size === "sm" ? "h-9 px-4 text-body-sm" : "h-11 px-6 text-body",
                variant === "primary"
                    ? "bg-primary text-white shadow-soft hover:bg-primary-hover hover:shadow-refined"
                    : variant === "ghost"
                        ? "bg-transparent text-text hover:bg-surface"
                        : "border border-border bg-card text-text shadow-soft hover:bg-bg hover:shadow-refined",
                className
            )}
            {...props}
        />
    );
}
