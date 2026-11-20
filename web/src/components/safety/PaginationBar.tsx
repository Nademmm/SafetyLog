import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '@/types/safetylog'

interface PaginationBarProps {
  meta?: PaginationMeta | null
  onPageChange: (page: number) => void
  isFetching?: boolean
}

export function PaginationBar({ meta, onPageChange, isFetching }: PaginationBarProps) {
  if (!meta || meta.last_page <= 1) return null

  const { current_page, last_page, total } = meta

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-4">
      <div className="text-[13px] text-[var(--muted)] tabular-nums">
        Halaman <span className="font-semibold text-[var(--text)]">{current_page}</span> dari{' '}
        <span className="font-semibold text-[var(--text)]">{last_page}</span> ·{' '}
        <span>{total} data</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, current_page - 1))}
          disabled={current_page <= 1 || isFetching}
          className="inline-flex h-11 items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(last_page, current_page + 1))}
          disabled={current_page >= last_page || isFetching}
          className="inline-flex h-11 items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] disabled:opacity-40"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
