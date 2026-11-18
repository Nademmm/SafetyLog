import * as React from 'react'
import { CheckCircle2, ClipboardCheck, RefreshCw, AlertTriangle, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AuthSession } from '@/lib/qr-flow'
import {
  type CaseActionItem,
  completeCaseAction,
  fetchMyActions,
} from '@/lib/role-api'

export interface MyActionsWorkspaceProps {
  session: AuthSession
}

export function MyActionsWorkspace({ session }: MyActionsWorkspaceProps) {
  const [filterStatus, setFilterStatus] = React.useState<'open' | 'completed' | 'all'>('open')
  const [actions, setActions] = React.useState<CaseActionItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const [activeActionId, setActiveActionId] = React.useState<number | null>(null)
  const [completionNote, setCompletionNote] = React.useState<string>('')
  const [photos, setPhotos] = React.useState<File[]>([])
  const [submitting, setSubmitting] = React.useState<boolean>(false)

  const loadActions = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchMyActions(session, filterStatus)
      setActions(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar tindakan saya.')
    } finally {
      setLoading(false)
    }
  }, [session, filterStatus])

  React.useEffect(() => {
    loadActions()
  }, [loadActions])

  const handleCompleteSubmit = async (e: React.FormEvent, actionId: number) => {
    e.preventDefault()
    if (completionNote.trim().length < 5) {
      setError('Catatan penyelesaian wajib diisi minimal 5 karakter.')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await completeCaseAction(session, actionId, completionNote.trim(), photos)
      setSuccessMsg(res.message || 'Tindakan berhasil diselesaikan.')
      setActiveActionId(null)
      setCompletionNote('')
      setPhotos([])
      await loadActions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyelesaikan tindakan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-off-white flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-industrial-orange stroke-[2px]" />
            Tindakan Saya (PIC)
          </h1>
          <p className="text-caption text-steel-muted">
            Daftar tindakan korektif dan preventif yang ditugaskan kepada {session.user.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['open', 'completed', 'all'] as const).map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={filterStatus === status ? 'industrial' : 'outline'}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'open' ? 'Berjalan' : status === 'completed' ? 'Selesai' : 'Semua'}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={loadActions} className="gap-1.5">
            <RefreshCw className="h-4 w-4 stroke-[2px]" />
            Muat Ulang
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
          {error}
        </div>
      )}

      {successMsg && (
        <div role="status" className="rounded-input border border-safety-safe-border bg-safety-safe-bg p-3 text-body text-safety-safe-foreground">
          {successMsg}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-center text-steel-muted">Memuat tugas tindakan Anda...</Card>
      ) : actions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Tidak Ada Tindakan</CardTitle>
            <CardDescription>
              Saat ini belum ada tindakan perbaikan atau pencegahan yang ditugaskan kepada Anda pada filter ini.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => {
            const isEditing = activeActionId === action.id
            return (
              <Card
                key={action.id}
                className={action.is_overdue && action.status === 'open' ? 'border-safety-danger-border bg-graphite' : 'bg-graphite'}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {action.safety_case?.case_number && (
                          <span className="font-mono text-caption font-bold text-industrial-orange">
                            {action.safety_case.case_number}
                          </span>
                        )}
                        <Badge variant={action.action_type === 'preventive' ? 'info' : 'secondary'}>
                          {action.action_type_label}
                        </Badge>
                        <Badge variant={action.status === 'completed' ? 'safe' : 'warning'}>
                          {action.status_label}
                        </Badge>
                        {action.is_overdue && action.status === 'open' && (
                          <Badge variant="danger" className="gap-1">
                            <AlertTriangle className="h-3 w-3 stroke-[2px]" />
                            Terlambat
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-h4 font-semibold text-off-white">{action.title}</h3>
                      {action.description && (
                        <p className="text-body text-steel-muted">{action.description}</p>
                      )}
                      <div className="text-caption text-steel-muted space-x-3">
                        {action.safety_case?.machine && (
                          <span>
                            Mesin: {action.safety_case.machine.code} - {action.safety_case.machine.name}
                          </span>
                        )}
                        {action.due_at && (
                          <span className="font-mono">Tenggat: {action.due_at}</span>
                        )}
                      </div>
                    </div>

                    {action.status === 'open' && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isEditing ? 'outline' : 'industrial'}
                        onClick={() => {
                          setActiveActionId(isEditing ? null : action.id)
                          setCompletionNote('')
                          setPhotos([])
                        }}
                      >
                        {isEditing ? 'Batal' : 'Selesaikan Tindakan'}
                      </Button>
                    )}
                  </div>

                  {action.status === 'completed' && action.completion_note && (
                    <div className="rounded-sm border border-safety-safe-border bg-safety-safe-bg/40 p-3 text-caption text-off-white">
                      <div className="font-semibold text-safety-safe-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 stroke-[2px]" />
                        Catatan Penyelesaian
                      </div>
                      <p className="mt-1 text-steel-muted">{action.completion_note}</p>
                    </div>
                  )}

                  {isEditing && (
                    <form
                      onSubmit={(e) => handleCompleteSubmit(e, action.id)}
                      className="border-t border-charcoal-border pt-3 space-y-3"
                    >
                      <div className="space-y-1">
                        <label
                          htmlFor={`complete-note-${action.id}`}
                          className="text-label text-off-white block"
                        >
                          Catatan Hasil Pekerjaan *
                        </label>
                        <textarea
                          id={`complete-note-${action.id}`}
                          rows={2}
                          required
                          value={completionNote}
                          onChange={(e) => setCompletionNote(e.target.value)}
                          placeholder="Jelaskan perbaikan/pencegahan yang telah selesai dikerjakan..."
                          className="flex w-full rounded-input border border-charcoal-border bg-[#151A20] px-3 py-2 text-body text-off-white placeholder:text-[#6F7782]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor={`complete-photos-${action.id}`}
                          className="text-label text-off-white flex items-center gap-1.5"
                        >
                          <Camera className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                          Foto Bukti Penyelesaian (Opsional)
                        </label>
                        <input
                          id={`complete-photos-${action.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 5))}
                          className="block w-full rounded-input border border-charcoal-border bg-carbon px-3 py-2 text-caption text-steel-muted"
                        />
                      </div>

                      <Button type="submit" disabled={submitting} variant="default" className="gap-2">
                        <CheckCircle2 className="h-4 w-4 stroke-[2px]" />
                        {submitting ? 'Menyimpan...' : 'Kirim Bukti Selesai'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
