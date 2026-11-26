import { Link, Navigate, useLocation } from 'react-router-dom'
import { roleHomePath, useAuth } from '@/lib/auth-helpers'
import { localizeRoleLabel, useLanguage } from '@/lib/i18n-helpers'
import { WaveformLoader } from '@/components/ui/waveform-loader'
import type { UserRole } from '@/types/safetylog'

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[]
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { lang, pick } = useLanguage()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ground)] flex items-center justify-center p-6">
        <WaveformLoader label={pick('Memuat sesi SafetyLog...', 'Loading SafetyLog session...')} />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
          <div className="text-[12px] font-mono text-[var(--safety-danger-foreground)]">
            {pick('HTTP 403 · Akses Ditolak', 'HTTP 403 · Access Denied')}
          </div>
          <h1 className="text-[22px] font-semibold text-[var(--text)]">
            {pick(
              `Halaman tidak tersedia untuk peran ${localizeRoleLabel(lang, user.role_label, user.role)}`,
              `Page unavailable for role ${localizeRoleLabel(lang, user.role_label, user.role)}`,
            )}
          </h1>
          <p className="text-[14px] text-[var(--muted)]">
            {pick(
              'Anda tidak memiliki hak akses ke halaman ini. Kembali ke beranda peran Anda.',
              'You do not have permission to access this page. Return to your role workspace.',
            )}
          </p>
          <Link
            to={roleHomePath(user.role)}
            className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
          >
            {pick('Kembali ke Beranda', 'Back to Home')}
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
