import * as React from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm' | 'icon'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] font-semibold border border-transparent',
  secondary:
    'bg-[var(--raised)] text-[var(--text)] hover:bg-[var(--nested)] font-medium border border-[var(--border)]',
  outline:
    'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--raised)] font-medium border border-[var(--control)]',
  danger:
    'bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)] border border-[var(--safety-danger-border)] hover:opacity-90 font-medium',
  ghost:
    'bg-transparent text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] font-medium border border-transparent',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-4 text-[14px] rounded-[6px]',
  sm: 'h-10 px-3.5 text-[13px] rounded-[6px]',
  icon: 'h-11 w-11 rounded-[6px]',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-45',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
