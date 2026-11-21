import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 self-start">{actions}</div>}
    </div>
  )
}
