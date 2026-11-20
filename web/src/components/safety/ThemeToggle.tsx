import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme-helpers'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan Mode Siang' : 'Aktifkan Mode Malam'}
      title={isDark ? 'Mode Siang' : 'Mode Malam'}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-colors',
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px] stroke-[1.75px]" />
      ) : (
        <Moon className="h-[18px] w-[18px] stroke-[1.75px]" />
      )}
    </button>
  )
}
