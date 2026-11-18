import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-button text-button font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-carbon disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        /* High-contrast neutral surface for primary actions (Rule: no warning colors for ordinary buttons) */
        default:
          'bg-off-white text-carbon hover:bg-white shadow-subtle',
        /* Industrial dark elevated charcoal */
        secondary:
          'bg-elevated text-off-white hover:bg-[#2E3742] border border-charcoal-border',
        /* Clean outline with industrial charcoal border */
        outline:
          'border border-charcoal-border bg-transparent text-off-white hover:bg-elevated hover:text-white',
        /* Subtle ghost action */
        ghost:
          'text-steel-muted hover:bg-elevated hover:text-off-white',
        /* Danger / Emergency Stop action */
        destructive:
          'bg-safety-danger text-white hover:bg-[#DC2626] shadow-subtle',
        /* Restrained Industrial Orange Accent (specialized K3 highlight action) */
        industrial:
          'bg-industrial-orange text-white hover:bg-industrial-orange-hover shadow-subtle',
        /* Subtle safety actions */
        'danger-subtle':
          'bg-safety-danger-bg text-safety-danger-foreground border border-safety-danger-border hover:bg-safety-danger/25',
        'safe-subtle':
          'bg-safety-safe-bg text-safety-safe-foreground border border-safety-safe-border hover:bg-safety-safe/25',
      },
      size: {
        default: 'h-11 px-4 py-2 min-h-touch', // 44px height for mobile/gloves
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base min-h-touch',
        icon: 'h-11 w-11 min-h-touch min-w-touch',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
