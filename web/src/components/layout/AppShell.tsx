import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  CheckSquare,
  ClipboardList,
  FilePlus2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { roleHomePath, useAuth } from '@/lib/auth-helpers'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/safety/ThemeToggle'
import type { AppNotification, UserRole } from '@/types/safetylog'

interface NavItem {
  label: string
  shortLabel: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  group: string
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Beranda Peran',
    shortLabel: 'Beranda',
    to: '__HOME__',
    icon: LayoutDashboard,
    roles: ['reporter', 'supervisor', 'hse', 'admin'],
    group: 'Utama',
  },
  {
    label: 'Lapor Cepat',
    shortLabel: 'Lapor',
    to: '/report',
    icon: FilePlus2,
    roles: ['reporter'],
    group: 'Utama',
  },
  {
    label: 'Kasus Saya',
    shortLabel: 'Kasus Saya',
    to: '/my-cases',
    icon: ClipboardList,
    roles: ['reporter'],
    group: 'Utama',
  },
  {
    label: 'Tindakan Saya',
    shortLabel: 'Tindakan',
    to: '/my-actions',
    icon: CheckSquare,
    roles: ['reporter', 'supervisor', 'hse', 'admin'],
    group: 'Utama',
  },
  {
    label: 'Antrean & Cari Kasus',
    shortLabel: 'Antrean',
    to: '/cases',
    icon: Search,
    roles: ['supervisor', 'hse', 'admin'],
    group: 'Operasional',
  },
  {
    label: 'Dashboard Pabrik',
    shortLabel: 'Dashboard',
    to: '/dashboard',
    icon: ShieldCheck,
    roles: ['supervisor', 'hse', 'admin'],
    group: 'Operasional',
  },
  {
    label: 'Riwayat Audit',
    shortLabel: 'Audit',
    to: '/audit-logs',
    icon: History,
    roles: ['supervisor', 'hse', 'admin'],
    group: 'Operasional',
  },
  {
    label: 'Area, Mesin & QR',
    shortLabel: 'Mesin QR',
    to: '/admin/machines',
    icon: Wrench,
    roles: ['admin'],
    group: 'Administrasi',
  },
  {
    label: 'Pengguna & Peran',
    shortLabel: 'Pengguna',
    to: '/admin/users',
    icon: Users,
    roles: ['admin'],
    group: 'Administrasi',
  },
  {
    label: 'Konfigurasi Risiko',
    shortLabel: 'Konfigurasi',
    to: '/admin/config',
    icon: Settings,
    roles: ['admin'],
    group: 'Administrasi',
  },
]

function SafetyLogMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="var(--accent)" strokeWidth="2" />
      <path
        d="M8 12.5L10.8 15.3L16.5 9.2"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [quickQuery, setQuickQuery] = React.useState('')
  const notifContainerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!mobileMenuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileMenuOpen])

  React.useEffect(() => {
    if (!notifOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [notifOpen])

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiFetch<{
        data: AppNotification[]
        unread_count: number
        action_alerts?: { overdue_count: number }
      }>('/notifications'),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (!user) return <>{children}</>

  const homeUrl = roleHomePath(user.role)
  const canAccessReport = user.role === 'reporter'
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => ({
    ...item,
    to: item.to === '__HOME__' ? homeUrl : item.to,
  }))

  const groups = Array.from(new Set(visibleItems.map((i) => i.group)))
  const unreadCount = notifQuery.data?.unread_count ?? 0
  const overdueCount = notifQuery.data?.action_alerts?.overdue_count ?? 0
  const notifications = notifQuery.data?.data ?? []

  const isActivePath = (to: string) => {
    if (to === homeUrl) return location.pathname === homeUrl
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = quickQuery.trim()
    if (!trimmed) return
    if (user.role === 'reporter') {
      navigate(`/my-cases?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate(`/cases?q=${encodeURIComponent(trimmed)}`)
    }
    setQuickQuery('')
    setMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    setNotifOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const mobileBottomItems = (
    user.role === 'reporter'
      ? visibleItems.slice(0, 4)
      : user.role === 'supervisor'
        ? [
            visibleItems[0],
            visibleItems.find((i) => i.to === '/cases'),
            visibleItems.find((i) => i.to === '/my-actions'),
            visibleItems.find((i) => i.to === '/dashboard'),
          ]
        : user.role === 'hse'
          ? [
              visibleItems[0],
              visibleItems.find((i) => i.to === '/cases'),
              visibleItems.find((i) => i.to === '/my-actions'),
              visibleItems.find((i) => i.to === '/dashboard'),
            ]
          : [
              visibleItems[0],
              visibleItems.find((i) => i.to === '/cases'),
              visibleItems.find((i) => i.to === '/dashboard'),
              visibleItems.find((i) => i.to === '/admin/machines'),
            ]
  ).filter((item): item is (typeof visibleItems)[number] => Boolean(item))

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--ground)] text-[var(--text)] flex flex-col lg:flex-row">
      {/* Desktop Ruled T-Frame Sidebar (fixed viewport height, non-scrollable to prevent scroll UI bugs) */}
      <aside className="hidden print:hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:w-[232px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--rule)] lg:bg-[var(--ground)]">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--rule)] px-5">
          <SafetyLogMark />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              SafetyLog
            </div>
            <div className="truncate text-[11px] text-[var(--faint)]">
              {user.organization?.name || 'Pabrik Manufaktur'}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-hidden px-3 py-2.5 space-y-3" aria-label="Navigasi utama">
          {groups.map((group) => (
            <div key={group} className="space-y-0.5">
              <div className="px-3 pb-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">
                {group}
              </div>
              {visibleItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon
                  const active = isActivePath(item.to)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'flex h-8.5 min-h-[34px] items-center gap-2.5 rounded-[6px] px-3 text-[13.5px] transition-colors',
                        active
                          ? 'bg-[var(--raised)] text-[var(--text)] font-medium'
                          : 'text-[var(--muted)] hover:text-[var(--text)]',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 stroke-[1.75px]" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[var(--rule)] p-3.5 space-y-2.5">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-[var(--text)]">{user.name}</div>
            <div className="truncate text-[12px] text-[var(--faint)]">
              {user.role_label} · {user.site?.code || 'SITE'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-full items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[13px] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]"
          >
            <LogOut className="h-4 w-4 stroke-[1.75px]" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar across Phone (56px), Tablet (60px), and Desktop (64px) */}
        <header className="print:hidden sticky top-0 z-30 flex h-14 sm:h-[60px] lg:h-16 items-center justify-between border-b border-[var(--rule)] bg-[var(--ground)] px-3 sm:px-5 lg:px-7 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to={homeUrl} className="flex items-center gap-2 lg:hidden min-w-0">
              <SafetyLogMark />
              <span className="truncate text-[15px] font-semibold text-[var(--text)]">
                SafetyLog
              </span>
            </Link>

            {/* Quick Search Input on Tablet & Desktop */}
            <form onSubmit={handleQuickSearch} className="hidden sm:flex items-center ml-1 lg:ml-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
                <input
                  type="search"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Cari kasus, mesin, kata kunci..."
                  className="h-11 w-[210px] md:w-[260px] lg:w-[340px] rounded-[6px] border border-[var(--control)] bg-[var(--surface)] pl-9 pr-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center h-full gap-1.5 sm:gap-2 shrink-0">
            {/* Icon-only Day/Night Mode Button in Navbar */}
            <ThemeToggle />

            {/* Notification Bell (B-18) */}
            <div ref={notifContainerRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifikasi"
                aria-expanded={notifOpen}
                className="relative flex h-11 w-11 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]"
              >
                <Bell className="h-[18px] w-[18px] stroke-[1.75px]" />
                {(unreadCount > 0 || overdueCount > 0) && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-[var(--safety-danger)] px-1 font-mono text-[11px] font-semibold text-white tabular-nums">
                    {unreadCount > 0 ? unreadCount : overdueCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[52px] z-50 sm:w-[360px] rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
                  <div className="flex items-center justify-between border-b border-[var(--rule)] px-4 py-3">
                    <span className="text-[14px] font-semibold text-[var(--text)]">Notifikasi</span>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        aria-label="Tutup notifikasi"
                        className="text-[var(--faint)] hover:text-[var(--text)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {overdueCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false)
                        navigate('/my-actions')
                      }}
                      className="flex w-full items-center gap-2.5 border-b border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-4 py-2.5 text-left text-[12px] text-[var(--safety-danger-foreground)] hover:opacity-90"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Anda memiliki <strong className="font-semibold">{overdueCount}</strong>{' '}
                        tindakan terlambat. Ketuk untuk membuka Tindakan Saya.
                      </span>
                    </button>
                  )}

                  <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--rule)]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[13px] text-[var(--faint)]">
                        Belum ada notifikasi baru.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.read_at) markReadMutation.mutate(n.id)
                            setNotifOpen(false)
                            if (n.safety_case_id) navigate(`/cases/${n.safety_case_id}`)
                          }}
                          className={cn(
                            'w-full px-4 py-3 text-left hover:bg-[var(--hover-row)]',
                            !n.read_at && 'bg-[var(--raised)]',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[13px] font-medium text-[var(--text)]">
                              {n.title}
                            </span>
                            {!n.read_at && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] text-[var(--muted)] line-clamp-2">
                            {n.body}
                          </p>
                          <div className="mt-1 text-[11px] text-[var(--faint)]">
                            {formatDateTime(n.created_at)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Report Button (hanya ditampilkan untuk peran yang berhak mengakses /report) */}
            {canAccessReport && (
              <Link
                to="/report"
                className="inline-flex h-11 items-center rounded-[6px] bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] lg:hidden"
              >
                Lapor
              </Link>
            )}

            <div className="hidden lg:flex h-full items-center border-l border-[var(--rule)] pl-4 ml-2 gap-3">
              <div className="text-right">
                <div className="text-[13px] font-medium text-[var(--text)]">{user.role_label}</div>
                <div className="text-[11px] text-[var(--faint)]">
                  {user.site?.name || 'Site Utama'}
                </div>
              </div>
              {canAccessReport && (
                <Link
                  to="/report"
                  className="inline-flex h-11 items-center rounded-[6px] bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
                >
                  Lapor Kasus
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page Canvas (responsive padding across 360px phone, 768px tablet, 1440px desktop) */}
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 sm:pb-24 lg:px-[29px] lg:py-7 lg:pb-10 print:p-0 print:max-w-none max-w-[1260px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile & Tablet Slide-Over Navigation Sheet (locked non-scrollable viewport) */}
      {mobileMenuOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--ground)] lg:hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--rule)] px-4">
            <div className="flex items-center gap-2">
              <SafetyLogMark />
              <span className="text-[15px] font-semibold text-[var(--text)]">SafetyLog</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 py-3 space-y-3">
            {/* Mobile Quick Search */}
            <form onSubmit={handleQuickSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
                <input
                  type="search"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Cari nomor kasus, mesin, kata kunci..."
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] pl-9 pr-3 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </form>

            {groups.map((group) => (
              <div key={group} className="space-y-0.5">
                <div className="px-2 pb-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">
                  {group}
                </div>
                {visibleItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const Icon = item.icon
                    const active = isActivePath(item.to)
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex h-10 items-center gap-3 rounded-[6px] px-3 text-[14px]',
                          active
                            ? 'bg-[var(--raised)] text-[var(--text)] font-medium'
                            : 'text-[var(--muted)]',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 stroke-[1.75px]" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-[var(--rule)] p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-[var(--text)]">{user.name}</div>
              <div className="truncate text-[12px] text-[var(--faint)]">
                {user.role_label} · {user.site?.name || 'Site Utama'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-4 text-[14px] text-[var(--text)]"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Phone & Tablet Bottom Navigation Bar (4 destinations, 56px + safe area) */}
      <nav
        aria-label="Navigasi bawah mobile"
        className="print:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-[var(--rule)] bg-[var(--ground)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon
          const active = isActivePath(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors',
                active ? 'text-[var(--text)] font-medium' : 'text-[var(--faint)] hover:text-[var(--muted)]',
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                />
              )}
              <Icon className="h-5 w-5 stroke-[1.75px]" />
              <span className="truncate max-w-[84px]">{item.shortLabel}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
