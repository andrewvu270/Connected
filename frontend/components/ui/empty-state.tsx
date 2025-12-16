import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn("text-center py-2xl", className)}>
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/10 mx-auto mb-xl">
          {icon}
        </div>
      )}
      <h3 className="text-title mb-sm">{title}</h3>
      {description && (
        <p className="text-body text-muted mb-xl max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button 
          variant="primary" 
          onClick={action.onClick}
          className="shadow-sm hover:shadow-md"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }