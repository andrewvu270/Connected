import * as React from "react"
import { cn } from "../../lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      default: "h-6 w-6", 
      lg: "h-8 w-8"
    }

    return (
      <div
        ref={ref}
        className={cn("animate-spin rounded-full border-2 border-border border-t-primary", sizeClasses[size], className)}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "card" | "avatar" | "button"
}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, variant = "text", ...props }, ref) => {
    const variantClasses = {
      text: "h-4 w-full rounded-lg",
      card: "h-32 w-full rounded-2xl",
      avatar: "h-12 w-12 rounded-full",
      button: "h-10 w-24 rounded-xl"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-gradient-to-r from-border-subtle via-border to-border-subtle bg-[length:200%_100%]",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
LoadingSkeleton.displayName = "LoadingSkeleton"

interface LoadingStateProps {
  children?: React.ReactNode
  className?: string
}

const LoadingState: React.FC<LoadingStateProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-2xl", className)}>
      <LoadingSpinner size="lg" className="mb-lg" />
      {children && (
        <p className="text-body text-muted text-center">{children}</p>
      )}
    </div>
  )
}

export { LoadingSpinner, LoadingSkeleton, LoadingState }