import * as React from "react"
import { cn } from "../../lib/utils"

interface BackgroundProps {
  variant?: "default" | "gradient" | "mesh" | "dots"
  className?: string
  children?: React.ReactNode
}

const Background: React.FC<BackgroundProps> = ({ 
  variant = "default", 
  className,
  children 
}) => {
  const backgrounds = {
    default: "bg-bg",
    gradient: "bg-gradient-to-br from-bg via-surface to-primary-subtle/10",
    mesh: "bg-bg relative overflow-hidden",
    dots: "bg-bg relative"
  }

  return (
    <div className={cn(backgrounds[variant], className)}>
      {variant === "mesh" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-subtle/20 via-transparent to-success-subtle/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-muted/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
        </>
      )}
      {variant === "dots" && (
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, rgb(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

export { Background }