import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const sectionVariants = cva(
  "relative",
  {
    variants: {
      spacing: {
        none: "",
        sm: "py-2xl",
        default: "py-4xl",
        lg: "py-5xl",
        xl: "py-6xl",
      },
      width: {
        full: "w-full",
        container: "mx-auto max-w-7xl px-8",
        narrow: "mx-auto max-w-4xl px-8",
        wide: "mx-auto max-w-8xl px-8",
      },
    },
    defaultVariants: {
      spacing: "default",
      width: "container",
    },
  }
)

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  as?: "section" | "div" | "main" | "article"
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing, width, as: Component = "section", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(sectionVariants({ spacing, width, className }))}
        {...props}
      />
    )
  }
)
Section.displayName = "Section"

export { Section, sectionVariants }