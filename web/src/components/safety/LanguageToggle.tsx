import { useLanguage } from '@/lib/i18n-helpers'
import { cn } from '@/lib/utils'

function IndonesiaFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden="true"
      className={cn('h-4 w-6 rounded-[2px] border border-black/15 shrink-0', className)}
    >
      <rect width="24" height="8" y="0" fill="#CE1126" />
      <rect width="24" height="8" y="8" fill="#FFFFFF" />
    </svg>
  )
}

function UnitedKingdomFlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      aria-hidden="true"
      className={cn('h-4 w-6 rounded-[2px] border border-black/15 shrink-0', className)}
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.2" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="11" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
    </svg>
  )
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useLanguage()
  const isEnglish = lang === 'en'

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={isEnglish ? 'Switch language to Indonesian' : 'Ganti bahasa ke English'}
      title={isEnglish ? 'English (UK) — klik untuk Bahasa Indonesia' : 'Bahasa Indonesia — click for English'}
      className={cn(
        'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 sm:px-3 text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--raised)] transition-colors cursor-pointer shrink-0',
        className,
      )}
    >
      {isEnglish ? <UnitedKingdomFlagIcon /> : <IndonesiaFlagIcon />}
      <span className="hidden sm:inline font-mono tracking-tight">
        {isEnglish ? 'EN' : 'ID'}
      </span>
    </button>
  )
}
