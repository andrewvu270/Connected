import * as React from "react"
import { cn } from "../../lib/utils"
import { Card, CardContent } from "./card"

interface StatCardProps {
  label: string
  value: string | number
  change?: {
    value: string
    trend: "up" | "down" | "neutral"
  }
  icon?: React.ReactNode
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  className
}) => {
  const trendColors = {
    up: "text-success",
    down: "text-error", 
    neutral: "text-muted"
  }

  return (
    <Card variant="elevated" className={cn("", className)}>
      <CardContent className="p-xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-label uppercase text-muted-light tracking-wider mb-sm">
              {label}
            </p>
            <p className="text-display-2 font-bold text-text">
              {value}
            </p>
            {change && (
              <p className={cn("text-body-sm font-medium mt-sm", trendColors[change.trend])}>
                {change.value}
              </p>
            )}
          </div>
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-subtle">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { StatCard }