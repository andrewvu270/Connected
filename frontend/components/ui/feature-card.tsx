import * as React from "react"
import { cn } from "../../lib/utils"
import { Card, CardContent } from "./card"

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  gradient?: string
  className?: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  gradient = "from-primary-subtle to-primary-muted",
  className
}) => {
  return (
    <Card variant="interactive" className={cn("group h-full", className)}>
      <CardContent className="p-2xl text-center h-full flex flex-col">
        <div className={cn(
          "mb-2xl flex h-20 w-20 items-center justify-center rounded-3xl mx-auto bg-gradient-to-br shadow-sm",
          gradient
        )}>
          <div className="transition-transform group-hover:scale-110 duration-300">
            {icon}
          </div>
        </div>
        <h3 className="mb-lg text-title">{title}</h3>
        <p className="text-body text-muted leading-relaxed flex-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

export { FeatureCard }