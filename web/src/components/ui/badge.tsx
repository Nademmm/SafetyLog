import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 text-label font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-off-white text-carbon',
        secondary:
          'border-charcoal-border bg-elevated text-off-white',
        outline:
          'border-charcoal-border bg-transparent text-steel-muted',
        /* K3 Safety Semantic Badges (ISO 7010 / ANSI Z535 compliant) */
        danger:
          'border-safety-danger-border bg-safety-danger-bg text-safety-danger-foreground',
        warning:
          'border-safety-warning-border bg-safety-warning-bg text-safety-warning-foreground',
        caution:
          'border-safety-caution-border bg-safety-caution-bg text-safety-caution-foreground',
        info:
          'border-safety-info-border bg-safety-info-bg text-safety-info-foreground',
        safe:
          'border-safety-safe-border bg-safety-safe-bg text-safety-safe-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
