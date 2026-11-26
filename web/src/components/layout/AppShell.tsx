import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
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
import { useAuth } from '@/lib/auth-helpers'
import { localizeRoleLabel, useLanguage, type TranslationKey } from '@/lib/i18n-helpers'
import { cn } from '@/lib/utils'
import {
  getMobileBottomPoliciesForRole,
  getNavPoliciesForRole,
  roleHomePath,
  ROUTE_ALLOWED_ROLES,
  type NavSection,
  type RoutePolicy,
} from '@/domain/access-policy'
import { SafetyLogMark } from '@/components/ui/SafetyLogMark'
import { LanguageToggle } from '@/components/safety/LanguageToggle'
import { ThemeToggle } from '@/components/safety/ThemeToggle'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'

const NAV_ICONS: Record<NonNullable<RoutePolicy['navIcon']>, React.ComponentType<{ className?: string }>> = {
  home: LayoutDashboard,
  scan: FilePlus2,
  'file-text': ClipboardList,
  wrench: CheckSquare,
  inbox: Search,
  dashboard: ShieldCheck,
  audit: History,
  machines: Wrench,
  users: Users,
  config: Settings,
}

const SECTION_KEY_MAP: Record<NavSection, TranslationKey> = {
  main: 'nav.section.main',
  manage: 'nav.section.manage',
  admin: 'nav.section.admin',
}

function NavGroupList({
  items,
  isActivePath,
  onNavigate,
  compact = false,
}: {
  items: RoutePolicy[]
  isActivePath: (to: string) => boolean
  onNavigate?: () => void
  compact?: boolean
}) {
  const { t } = useLanguage()
  const sections = Array.from(
    new Set(items.map((item) => item.navSection).filter((s): s is NavSection => Boolean(s))),
  )

  return (
    <>
      {sections.map((section) => (
        <div key={section} className={compact ? 'space-y-0.5' : 'space-y-1'}>
          <div
            className={
              compact
                ? 'px-2 pb-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]'
                : 'px-3 pb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--faint)]'
            }
          >
            {t(SECTION_KEY_MAP[section])}
          </div>
          {items
            .filter((item) => item.navSection === section)
            .map((item) => {
              const Icon = item.navIcon ? NAV_ICONS[item.navIcon] : LayoutDashboard
              const active = isActivePath(item.path)
              const navKey = `nav.${item.id}` as TranslationKey
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex min-h-[44px] items-center rounded-[6px] px-3 text-[14px] transition-colors',
                    compact ? 'gap-3' : 'gap-2.5',
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] font-medium',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 stroke-[1.85px]',
                      active ? 'text-[var(--accent)]' : 'text-[var(--faint)]',
                    )}
                  />
                  <span className="truncate">{t(navKey)}</span>
                </Link>
              )
            })}
        </div>
      ))}
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { t, lang } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [quickQuery, setQuickQuery] = React.useState('')

  React.useEffect(() => {
    if (!mobileMenuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileMenuOpen])

  if (!user) return <>{children}</>

  const homeUrl = roleHomePath(user.role)
  const canAccessReport = ROUTE_ALLOWED_ROLES.report.includes(user.role)
  const visibleItems = getNavPoliciesForRole(user.role)
  const mobileBottomItems = getMobileBottomPoliciesForRole(user.role)

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
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--ground)] text-[var(--text)] flex flex-col lg:flex-row">
      {/* Desktop Ruled Sidebar */}
      <aside className="hidden print:hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:w-[240px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--border)] lg:bg-[var(--surface)]">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--rule)] px-5">
          <SafetyLogMark />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              SafetyLog
            </div>
            <div className="truncate text-[12px] text-[var(--faint)]">
              {user.organization?.name || (lang === 'en' ? 'Manufacturing Plant' : 'Pabrik Manufaktur')}
            </div>
          </div>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
          aria-label={lang === 'en' ? 'Main navigation' : 'Navigasi utama'}
        >
          <NavGroupList items={visibleItems} isActivePath={isActivePath} />
        </nav>

        <div className="shrink-0 border-t border-[var(--rule)] p-3.5 space-y-2.5">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-[var(--text)]">{user.name}</div>
            <div className="truncate text-[12px] text-[var(--faint)]">
              {localizeRoleLabel(lang, user.role_label, user.role)} · {user.site?.code || 'SITE'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-full items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] cursor-pointer"
          >
            <LogOut className="h-4 w-4 stroke-[1.75px]" />
            <span>{t('shell.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print:hidden sticky top-0 z-30 flex h-14 sm:h-[60px] lg:h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-5 lg:px-7 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('shell.openMenu')}
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

            <form onSubmit={handleQuickSearch} className="hidden sm:flex items-center ml-1 lg:ml-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
                <input
                  type="search"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder={t('shell.searchPlaceholder')}
                  className="h-11 w-[210px] md:w-[260px] lg:w-[340px] rounded-[6px] border border-[var(--control)] bg-[var(--surface)] pl-9 pr-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center h-full gap-1.5 sm:gap-2 shrink-0">
            <LanguageToggle />
            <ThemeToggle />

            <NotificationCenter userRole={user.role} />

            {canAccessReport && (
              <Link
                to="/report"
                className="inline-flex h-11 items-center rounded-[6px] bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] lg:hidden"
              >
                {t('shell.reportShort')}
              </Link>
            )}

            <div className="hidden lg:flex h-full items-center border-l border-[var(--rule)] pl-4 ml-2 gap-3">
              <div className="text-right">
                <div className="text-[13px] font-medium text-[var(--text)]">
                  {localizeRoleLabel(lang, user.role_label, user.role)}
                </div>
                <div className="text-[12px] text-[var(--faint)]">
                  {user.site?.name || (lang === 'en' ? 'Main Site' : 'Site Utama')}
                </div>
              </div>
              {canAccessReport && (
                <Link
                  to="/report"
                  className="inline-flex h-11 items-center rounded-[6px] bg-[var(--primary)] px-3.5 text-[13px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
                >
                  {t('shell.reportCase')}
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 sm:pb-24 lg:px-[29px] lg:py-7 lg:pb-10 print:p-0 print:max-w-none max-w-[1260px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile & Tablet Slide-Over Navigation Sheet */}
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
                aria-label={t('shell.closeMenu')}
                className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <form onSubmit={handleQuickSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
                <input
                  type="search"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder={t('shell.searchPlaceholderMobile')}
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] pl-9 pr-3 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </form>

            <NavGroupList
              items={visibleItems}
              isActivePath={isActivePath}
              onNavigate={() => setMobileMenuOpen(false)}
              compact
            />
          </div>

          <div className="shrink-0 border-t border-[var(--rule)] p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-[var(--text)]">{user.name}</div>
              <div className="truncate text-[12px] text-[var(--faint)]">
                {localizeRoleLabel(lang, user.role_label, user.role)} · {user.site?.name || (lang === 'en' ? 'Main Site' : 'Site Utama')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-4 text-[14px] text-[var(--text)]"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('shell.logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Phone & Tablet Bottom Navigation Bar */}
      <nav
        aria-label={lang === 'en' ? 'Mobile bottom navigation' : 'Navigasi bawah mobile'}
        className="print:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.navIcon ? NAV_ICONS[item.navIcon] : LayoutDashboard
          const active = isActivePath(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors',
                active ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]',
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                />
              )}
              <Icon className="h-5 w-5 stroke-[1.75px]" />
              <span className="truncate max-w-[84px]">
                {t(`nav.${item.id}.short` as TranslationKey)}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
