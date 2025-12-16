import * as React from "react"
import { cn } from "../../lib/utils"

interface HeroProps {
  title: string
  subtitle?: string
  description?: string
  actions?: React.ReactNode
  visual?: React.ReactNode
  className?: string
}

const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  description,
  actions,
  visual,
  className
}) => {
  return (
    <div className={cn("grid gap-4xl lg:grid-cols-2 lg:gap-5xl items-center", className)}>
      <div className="flex flex-col justify-center text-center lg:text-left">
        {subtitle && (
          <div className="mb-lg">
            <span className="inline-flex items-center rounded-full bg-primary-subtle px-4 py-2 text-body-sm font-medium text-primary border border-primary-muted/30">
              {subtitle}
            </span>
          </div>
        )}
        
        <h1 className="text-display-2 md:text-display-1 bg-gradient-to-br from-text to-text-secondary bg-clip-text text-transparent mb-2xl">
          {title}
        </h1>

        {description && (
          <p className="text-body-lg text-muted leading-relaxed mb-2xl max-w-xl lg:max-w-none">
            {description}
          </p>
        )}

        {actions && (
          <div className="flex flex-wrap justify-center lg:justify-start gap-lg">
            {actions}
          </div>
        )}
      </div>

      {visual && (
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            {visual}
          </div>
        </div>
      )}
    </div>
  )
}

export { Hero }