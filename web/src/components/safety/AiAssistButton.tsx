import { Loader2, Sparkles } from 'lucide-react'

interface AiAssistButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label: string
  loadingLabel: string
}

/**
 * Tombol aksi fitur bantu AI yang konsisten dengan palet aksen SafetyLog
 * (Mode Siang & Mode Malam) serta target sentuh minimal 44px.
 */
export function AiAssistButton({
  onClick,
  disabled = false,
  loading = false,
  label,
  loadingLabel,
}: AiAssistButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-[6px] border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3.5 text-[13px] font-semibold text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-colors"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  )
}
