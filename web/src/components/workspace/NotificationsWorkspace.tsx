import * as React from 'react'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AuthSession } from '@/lib/qr-flow'
import {
  type NotificationItem,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/role-api'

export interface NotificationsWorkspaceProps {
  session: AuthSession
  onUnreadCountChange?: (count: number) => void
}

export function NotificationsWorkspace({
  session,
  onUnreadCountChange,
}: NotificationsWorkspaceProps) {
  const [items, setItems] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<number | 'all' | null>(null)

  const loadNotifications = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchNotifications(session)
      setItems(res.notifications)
      setUnreadCount(res.unreadCount)
      onUnreadCountChange?.(res.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi.')
    } finally {
      setLoading(false)
    }
  }, [session, onUnreadCountChange])

  React.useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkRead = async (id: number) => {
    setBusyId(id)
    try {
      await markNotificationRead(session, id)
      await loadNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui notifikasi.')
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAll = async () => {
    setBusyId('all')
    try {
      await markAllNotificationsRead(session)
      await loadNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menandai semua notifikasi.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-off-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-industrial-orange stroke-[2px]" />
            Notifikasi Saya
          </h1>
          <p className="text-caption text-steel-muted">
            Pembaruan penugasan, triase, verifikasi, dan pengingat tenggat tindakan untuk {session.user.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadNotifications} className="gap-1.5">
            <RefreshCw className="h-4 w-4 stroke-[2px]" />
            Muat Ulang
          </Button>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busyId === 'all'}
              onClick={handleMarkAll}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4 stroke-[2px]" />
              Tandai Semua Dibaca ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-center text-steel-muted">Memuat notifikasi...</Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Belum Ada Notifikasi</CardTitle>
            <CardDescription>
              Anda akan menerima notifikasi saat laporan diperbarui atau ketika Anda ditunjuk sebagai PIC tindakan.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={item.read_at ? 'bg-graphite' : 'border-industrial-orange/60 bg-graphite'}
            >
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-off-white">{item.title}</span>
                    {!item.read_at && <Badge variant="warning">Belum Dibaca</Badge>}
                  </div>
                  <p className="text-body text-steel-muted">{item.message ?? item.body ?? ''}</p>
                  <div className="font-mono text-[11px] text-steel-muted">{item.created_at}</div>
                </div>
                {!item.read_at && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => handleMarkRead(item.id)}
                  >
                    Tandai Dibaca
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
