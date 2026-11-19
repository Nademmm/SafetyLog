import { Link, Navigate, useLocation } from 'react-router-dom'
import { roleHomePath, useAuth } from '@/lib/auth'
import type { UserRole } from '@/types/safetylog'

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[]
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ground)] flex items-center justify-center p-6">
        <div className="space-y-2 text-center">
          <div className="h-2 w-32 rounded bg-[var(--raised)] mx-auto" />
          <p className="text-[13px] text-[var(--faint)]">Memuat sesi SafetyLog...</p>
        </div>
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
            HTTP 403 · Akses Ditolak
          </div>
          <h1 className="text-[22px] font-semibold text-[var(--text)]">
            Halaman tidak tersedia untuk peran {user.role_label}
          </h1>
          <p className="text-[14px] text-[var(--muted)]">
            Anda tidak memiliki hak akses ke halaman ini. Kembali ke beranda peran Anda.
          </p>
          <Link
            to={roleHomePath(user.role)}
            className="inline-flex h-11 items-center justify-center rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
