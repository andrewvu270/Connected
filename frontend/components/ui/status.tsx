import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const statusVariants = cva(
  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-success-subtle text-success border border-success/20",
        warning: "bg-warning-subtle text-warning border border-warning/20",
        error: "bg-error-subtle text-error border border-error/20",
        info: "bg-primary-subtle text-primary border border-primary-muted/20",
        neutral: "bg-surface-elevated text-text-secondary border border-border",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

const statusDotVariants = cva(
  "h-2 w-2 rounded-full",
  {
    variants: {
      variant: {
        success: "bg-success",
        warning: "bg-warning", 
        error: "bg-error",
        info: "bg-primary",
        neutral: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface StatusProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  showDot?: boolean
}

const Status = React.forwardRef<HTMLDivElement, StatusProps>(
  ({ className, variant, showDot = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(statusVariants({ variant, className }))}
        {...props}
      >
        {showDot && <div className={statusDotVariants({ variant })} />}
        {children}
      </div>
    )
  }
)
Status.displayName = "Status"

export { Status, statusVariants }