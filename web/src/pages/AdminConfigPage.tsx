import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import { useReferenceData } from '@/lib/reference'
import type { RiskConfig } from '@/types/safetylog'

export function AdminConfigPage() {
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()
  const riskConfigs = refQuery.data?.risk_configs ?? []

  const [savingId, setSavingId] = React.useState<number | null>(null)
  const [savedId, setSavedId] = React.useState<number | null>(null)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)

  const handleSaveRisk = async (rc: RiskConfig, form: HTMLFormElement) => {
    setErrMsg(null)
    setSavingId(rc.id)
    setSavedId(null)
    const fd = new FormData(form)
    try {
      await apiFetch(`/risk-configs/${rc.id}`, {
        method: 'PATCH',
        json: {
          min_score: Number(fd.get('min_score')),
          max_score: Number(fd.get('max_score')),
          first_response_hours: Number(fd.get('first_response_hours')),
          temporary_action_hours: Number(fd.get('temporary_action_hours')),
          permanent_action_hours: Number(fd.get('permanent_action_hours')),
          requires_preventive_action: fd.get('requires_preventive_action') === 'on',
        },
      })
      setSavedId(rc.id)
      void queryClient.invalidateQueries({ queryKey: ['reference-data'] })
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menyimpan konfigurasi.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-8 max-w-[1152px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Konfigurasi Matriks Risiko &amp; SLA
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Ambang skor dan target waktu (SLA) disimpan di database sehingga mudah disesuaikan dengan standar pabrik tanpa mengubah kode.
        </p>
      </div>

      {errMsg && (
        <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-4 py-3 text-[13px] text-[var(--safety-danger-foreground)]">
          {errMsg}
        </div>
      )}

      {/* Two-Column Settings Layout (app-screens.md §8.2) */}
      <div className="divide-y divide-[var(--rule)]">
        {riskConfigs.map((rc) => (
          <div key={rc.id} className="grid grid-cols-1 gap-6 py-7 lg:grid-cols-12 items-start">
            <div className="lg:col-span-4 space-y-1.5">
              <h2 className="text-[16px] font-medium text-[var(--text)]">Level Risiko: {rc.label}</h2>
              <p className="text-[14px] text-[var(--faint)]">
                Skor saat ini: {rc.min_score}–{rc.max_score}. Target permanen: {rc.permanent_action_hours} jam.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSaveRisk(rc, e.currentTarget)
              }}
              className="lg:col-span-8 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[var(--muted)]">Skor Min</label>
                  <input
                    name="min_score"
                    type="number"
                    defaultValue={rc.min_score}
                    className="h-10 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[var(--muted)]">Skor Maks</label>
                  <input
                    name="max_score"
                    type="number"
                    defaultValue={rc.max_score}
                    className="h-10 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[var(--muted)]">Respon (jam)</label>
                  <input
                    name="first_response_hours"
                    type="number"
                    defaultValue={rc.first_response_hours}
                    className="h-10 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[var(--muted)]">Permanen (jam)</label>
                  <input
                    name="permanent_action_hours"
                    type="number"
                    defaultValue={rc.permanent_action_hours}
                    className="h-10 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums"
                  />
                </div>
              </div>

              <input
                type="hidden"
                name="temporary_action_hours"
                value={rc.temporary_action_hours}
              />

              <label className="flex items-center gap-2.5 text-[14px] text-[var(--text)]">
                <input
                  type="checkbox"
                  name="requires_preventive_action"
                  defaultChecked={rc.requires_preventive_action}
                  className="h-4 w-4 accent-[#22c55e]"
                />
                <span>Wajib tindakan Preventif sebelum kasus ditutup</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-1">
                {savedId === rc.id && (
                  <span className="text-[13px] text-[var(--safety-safe-foreground)]">Tersimpan</span>
                )}
                <button
                  type="submit"
                  disabled={savingId === rc.id}
                  className="h-10 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {savingId === rc.id ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
