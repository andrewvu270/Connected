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
        "inline-flex items-center justify-center rounded-xl text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-9 px-3" : "h-11 px-4",
        variant === "primary"
          ? "bg-primary text-white shadow-soft hover:opacity-95"
          : variant === "ghost"
            ? "bg-transparent text-text hover:bg-bg"
            : "border border-border bg-card text-text shadow-soft hover:bg-bg",
        className
      )}
      {...props}
    />
  );
}
