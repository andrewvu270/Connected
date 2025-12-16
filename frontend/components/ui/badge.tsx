import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-primary-subtle text-primary border border-primary-muted/20",
        secondary:
          "bg-surface-elevated text-text-secondary border border-border",
        success:
          "bg-success-subtle text-success border border-success/20",
        warning:
          "bg-warning-subtle text-warning border border-warning/20",
        error:
          "bg-error-subtle text-error border border-error/20",
        outline: 
          "border border-border text-muted bg-transparent hover:bg-surface-elevated",
        ghost:
          "bg-surface text-muted hover:bg-surface-elevated hover:text-text",
        // Category-specific badges
        tech: "bg-blue-50 text-blue-700 border border-blue-200",
        business: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        politics: "bg-purple-50 text-purple-700 border border-purple-200",
        science: "bg-cyan-50 text-cyan-700 border border-cyan-200",
        culture: "bg-pink-50 text-pink-700 border border-pink-200",
        sports: "bg-orange-50 text-orange-700 border border-orange-200",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
