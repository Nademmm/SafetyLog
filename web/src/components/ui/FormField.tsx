import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const CONTROL_BASE_CLASS =
  'w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--faint)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50'

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredMark?: boolean
}

export function FieldLabel({ className, requiredMark, children, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn('block text-[13px] font-semibold text-[var(--text)]', className)}
      {...props}
    >
      {children}
      {requiredMark && <span className="ml-0.5 text-[var(--safety-danger)]">*</span>}
    </label>
  )
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(CONTROL_BASE_CLASS, 'h-11 px-3.5 text-[15px] sm:text-[14px]', className)}
    {...props}
  />
))
Input.displayName = 'Input'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative w-full">
    <select
      ref={ref}
      className={cn(
        CONTROL_BASE_CLASS,
        'h-11 appearance-none pl-3 pr-9 text-[15px] sm:text-[14px] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
    />
  </div>
))
Select.displayName = 'Select'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(CONTROL_BASE_CLASS, 'p-3.5 text-[15px] sm:text-[14px]', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
