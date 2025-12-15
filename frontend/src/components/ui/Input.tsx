import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-text",
        "placeholder:text-muted",
        "outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
        className
      )}
      {...props}
    />
  );
}
