import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  ariaLabel?: string
  maxWidthClassName?: string
  children: React.ReactNode
  footer?: React.ReactNode
  headerExtra?: React.ReactNode
  closeDisabled?: boolean
}

export function ModalDialog({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  maxWidthClassName = 'max-w-lg',
  children,
  footer,
  headerExtra,
  closeDisabled = false,
}: ModalDialogProps) {
  React.useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closeDisabled) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, closeDisabled])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      onClick={() => {
        if (!closeDisabled) onClose()
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4 backdrop-blur-[1px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-h-[90vh] flex flex-col overflow-hidden rounded-t-[14px] sm:rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-xl',
          maxWidthClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 sm:px-5 py-3.5 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Tutup dialog"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--ink)] transition-colors disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t border-[var(--line)] bg-[var(--raised)]/40 px-4 sm:px-5 py-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
