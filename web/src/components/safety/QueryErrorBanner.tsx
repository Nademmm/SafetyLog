import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/lib/i18n-helpers'

interface QueryErrorBannerProps {
  message?: string
  onRetry?: () => void
}

export function QueryErrorBanner({ message, onRetry }: QueryErrorBannerProps) {
  const { pick } = useLanguage()
  const resolvedMessage =
    message ??
    pick(
      'Gagal memuat data. Periksa koneksi jaringan Anda lalu coba lagi.',
      'Failed to load data. Check your network connection and try again.',
    )

  return (
    <div className="rounded-[8px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 text-[13px] text-[var(--safety-danger-foreground)]">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{resolvedMessage}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center gap-1.5 rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {pick('Coba Lagi', 'Retry')}
        </button>
      )}
    </div>
  )
}
