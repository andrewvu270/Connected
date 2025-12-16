import * as React from "react"
import { cn } from "../../lib/utils"

interface ProgressProps {
  value: number
  max?: number
  size?: "sm" | "default" | "lg"
  variant?: "default" | "success" | "warning" | "error"
  showLabel?: boolean
  label?: string
  className?: string
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = "default",
  variant = "default",
  showLabel = false,
  label,
  className
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizeClasses = {
    sm: "h-2",
    default: "h-3",
    lg: "h-4"
  }
  
  const variantClasses = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning", 
    error: "bg-error"
  }

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-sm">
          <span className="text-body-sm font-medium text-text">
            {label || "Progress"}
          </span>
          <span className="text-body-sm text-muted">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={cn(
        "w-full bg-border-subtle rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export { Progress }