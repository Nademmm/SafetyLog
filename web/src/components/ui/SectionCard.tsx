import * as React from 'react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  noBodyPadding?: boolean
}

export function SectionCard({
  title,
  subtitle,
  headerRight,
  children,
  className,
  bodyClassName,
  noBodyPadding = false,
}: SectionCardProps) {
  const hasHeader = Boolean(title || headerRight || subtitle)

  return (
    <section
      className={cn(
        'rounded-[8px] border border-[var(--border)] bg-[var(--surface)]',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[16px] font-semibold text-[var(--text)]">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{subtitle}</p>}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className={cn(!noBodyPadding && 'p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
