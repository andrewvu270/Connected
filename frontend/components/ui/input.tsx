import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const inputVariants = cva(
  "flex w-full rounded-xl border bg-surface px-4 py-3 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-border shadow-xs hover:border-border focus-visible:border-primary focus-visible:shadow-focus",
        filled: "border-transparent bg-surface-elevated shadow-xs hover:shadow-sm focus-visible:shadow-focus focus-visible:bg-surface",
        ghost: "border-transparent bg-transparent hover:bg-surface-elevated focus-visible:bg-surface focus-visible:shadow-sm",
      },
      inputSize: {
        sm: "h-8 px-3 py-2 text-xs rounded-lg",
        default: "h-10 px-4 py-3 text-sm",
        lg: "h-12 px-6 py-4 text-base rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
