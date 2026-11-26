import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/lib/i18n-helpers'
import { cn } from '@/lib/utils'
import { notificationKeys } from '@/data/query-keys'
import { invalidateNotificationMutation } from '@/data/invalidation'
import type { AppNotification, UserRole } from '@/types/safetylog'

export function NotificationCenter({ userRole }: { userRole: UserRole }) {
  const { t, pick } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const notifQuery = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () =>
      apiFetch<{
        data: AppNotification[]
        unread_count: number
        action_alerts?: { overdue_count: number }
      }>('/notifications'),
    refetchInterval: 30_000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => void invalidateNotificationMutation(queryClient),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => void invalidateNotificationMutation(queryClient),
  })

  const unreadCount = notifQuery.data?.unread_count ?? 0
  const overdueCount = notifQuery.data?.action_alerts?.overdue_count ?? 0
  const notifications = notifQuery.data?.data ?? []

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('notif.title')}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]"
      >
        <Bell className="h-[18px] w-[18px] stroke-[1.75px]" />
        {(unreadCount > 0 || overdueCount > 0) && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-[var(--safety-danger)] px-1 font-mono text-[11px] font-semibold text-white tabular-nums">
            {unreadCount > 0 ? unreadCount : overdueCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[52px] z-50 sm:w-[360px] rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-4 py-3">
            <span className="text-[14px] font-semibold text-[var(--text)]">{t('notif.title')}</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {t('notif.markAll')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('notif.close')}
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
                setOpen(false)
                navigate(userRole === 'reporter' ? '/my-actions' : '/dashboard')
              }}
              className="flex w-full items-center gap-2.5 border-b border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-4 py-2.5 text-left text-[12px] text-[var(--safety-danger-foreground)] hover:opacity-90"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {pick(
                  <>
                    Anda memiliki <strong className="font-semibold">{overdueCount}</strong> tindakan
                    terlambat. Ketuk untuk membuka{' '}
                    {userRole === 'reporter' ? 'Tindakan Saya' : 'Dashboard'}.
                  </>,
                  <>
                    You have <strong className="font-semibold">{overdueCount}</strong> overdue
                    actions. Tap to open {userRole === 'reporter' ? 'My Actions' : 'Dashboard'}.
                  </>,
                )}
              </span>
            </button>
          )}

          <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--rule)]">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--faint)]">
                {t('notif.empty')}
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.read_at) markReadMutation.mutate(n.id)
                    setOpen(false)
                    if (n.safety_case_id) navigate(`/cases/${n.safety_case_id}`)
                  }}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-[var(--hover-row)]',
                    !n.read_at && 'bg-[var(--raised)] border-l-2 border-l-[var(--accent)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-medium text-[var(--text)]">{n.title}</span>
                    {!n.read_at && (
                      <span className="shrink-0 rounded-[4px] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {t('notif.new')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)] line-clamp-2">{n.body}</p>
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
  )
}
