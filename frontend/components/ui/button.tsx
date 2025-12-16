import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md focus-visible:shadow-focus rounded-xl px-6 py-3 text-sm font-semibold",
        secondary:
          "bg-surface border border-border text-text shadow-xs hover:bg-surface-elevated hover:shadow-sm hover:border-border focus-visible:shadow-focus rounded-xl px-6 py-3 text-sm font-medium",
        ghost: 
          "text-muted hover:text-text hover:bg-surface-elevated rounded-xl px-4 py-2 text-sm font-medium",
        outline:
          "border border-border bg-transparent text-text shadow-xs hover:bg-surface hover:shadow-sm focus-visible:shadow-focus rounded-xl px-6 py-3 text-sm font-medium",
        link: 
          "text-primary hover:text-primary-hover underline-offset-4 hover:underline font-medium",
        danger:
          "bg-error text-white shadow-sm hover:bg-error/90 hover:shadow-md focus-visible:shadow-focus rounded-xl px-6 py-3 text-sm font-semibold",
        success:
          "bg-success text-white shadow-sm hover:bg-success/90 hover:shadow-md focus-visible:shadow-focus rounded-xl px-6 py-3 text-sm font-semibold",
      },
      size: {
        sm: "h-8 px-4 py-2 text-xs rounded-lg",
        default: "h-10 px-6 py-3 text-sm",
        lg: "h-12 px-8 py-4 text-base rounded-2xl",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
