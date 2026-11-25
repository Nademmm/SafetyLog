import * as React from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCount: number
  title?: string
  buttonLabel?: string
  onReset?: () => void
  popoverWidthClassName?: string
  children: React.ReactNode
}

export function FilterSheet({
  open,
  onOpenChange,
  activeCount,
  title = 'Filter',
  buttonLabel = 'Filter',
  onReset,
  popoverWidthClassName = 'sm:w-[360px]',
  children,
}: FilterSheetProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-[8px] border px-3.5 text-[13px] font-medium transition-colors',
          activeCount > 0 || open
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--raised)]',
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        <span>{buttonLabel}</span>
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-mono font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            aria-hidden="true"
          />
          <div
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[16px] border-t border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl',
              'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[75vh] sm:rounded-[10px] sm:border',
              popoverWidthClassName,
            )}
          >
            <div className="mb-3 flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <span className="text-[13.5px] font-semibold text-[var(--ink)]">{title}</span>
              <div className="flex items-center gap-1">
                {onReset && activeCount > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex h-9 items-center rounded-[6px] px-2.5 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Tutup filter"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {children}
          </div>
        </>
      )}
    </div>
  )
}
