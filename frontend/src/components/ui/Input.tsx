import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                "h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-text",
                "placeholder:text-muted",
                "focus:outline-none focus:ring-2 focus:ring-primary/25",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "transition",
                className
            )}
            {...props}
        />
    );
}
