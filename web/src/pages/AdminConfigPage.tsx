import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import { localizeRiskLevelLabel, useLanguage } from '@/lib/i18n-helpers'
import { useReferenceData } from '@/lib/reference'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { RiskConfig } from '@/types/safetylog'

export function AdminConfigPage() {
  const { lang, pick } = useLanguage()
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()
  const riskConfigs = refQuery.data?.risk_configs ?? []
  const configs = refQuery.data?.configurations ?? {}

  const [savingId, setSavingId] = React.useState<number | null>(null)
  const [savedId, setSavedId] = React.useState<number | null>(null)
  const [savingOrgConfig, setSavingOrgConfig] = React.useState(false)
  const [savedOrgConfig, setSavedOrgConfig] = React.useState(false)
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
      setErrMsg(
        err instanceof ApiError
          ? err.message
          : pick('Gagal menyimpan konfigurasi.', 'Failed to save configuration.'),
      )
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveGeneralConfigs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrMsg(null)
    setSavingOrgConfig(true)
    setSavedOrgConfig(false)
    const fd = new FormData(e.currentTarget)
    try {
      const updates: Array<{ key: string; value: number | string }> = [
        { key: 'open_case_warning_days', value: Number(fd.get('open_case_warning_days')) },
        { key: 'recurring_case_threshold', value: Number(fd.get('recurring_case_threshold')) },
        { key: 'recurring_window_days', value: Number(fd.get('recurring_window_days')) },
        {
          key: 'emergency_reminder_text',
          value: String(fd.get('emergency_reminder_text') || '').trim(),
        },
      ]

      for (const item of updates) {
        await apiFetch(`/configurations/${item.key}`, {
          method: 'PUT',
          json: { value: item.value },
        })
      }

      setSavedOrgConfig(true)
      void queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      setErrMsg(
        err instanceof ApiError
          ? err.message
          : pick('Gagal menyimpan konfigurasi umum.', 'Failed to save general configuration.'),
      )
    } finally {
      setSavingOrgConfig(false)
    }
  }

  return (
    <div className="space-y-8 max-w-[1152px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          {pick('Konfigurasi Matriks Risiko & SLA', 'Risk Matrix & SLA Configuration')}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          {pick(
            'Ambang skor, target waktu (SLA), dan aturan organisasi disimpan di database sehingga mudah disesuaikan dengan standar pabrik tanpa mengubah kode.',
            'Score thresholds, SLA targets, and organization rules are stored in the database so they can be adjusted to plant standards without code changes.',
          )}
        </p>
      </div>

      {refQuery.isError && (
        <QueryErrorBanner
          message={pick('Gagal memuat konfigurasi organisasi.', 'Failed to load organization configuration.')}
          onRetry={() => void refQuery.refetch()}
        />
      )}

      {errMsg && (
        <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-4 py-3 text-[13px] text-[var(--safety-danger-foreground)]">
          {errMsg}
        </div>
      )}

      {refQuery.isLoading ? (
        <SectionLoading label={pick('Memuat konfigurasi organisasi...', 'Loading organization configuration...')} />
      ) : (
        <>
          {/* Risk Matrix & SLA Section */}
          <div className="divide-y divide-[var(--rule)]">
            {riskConfigs.map((rc) => (
              <div
                key={rc.id}
                className="grid grid-cols-1 gap-6 py-7 lg:grid-cols-12 items-start"
              >
                <div className="lg:col-span-4 space-y-1.5">
                  <h2 className="text-[16px] font-semibold text-[var(--text)]">
                    {pick('Level Risiko:', 'Risk Level:')} {localizeRiskLevelLabel(lang, rc.label, rc.level)}
                  </h2>
                  <p className="text-[14px] text-[var(--muted)]">
                    {pick(
                      `Skor saat ini: ${rc.min_score}–${rc.max_score}. Sementara: ${rc.temporary_action_hours} jam · Permanen: ${rc.permanent_action_hours} jam.`,
                      `Current score: ${rc.min_score}–${rc.max_score}. Temporary: ${rc.temporary_action_hours}h · Permanent: ${rc.permanent_action_hours}h.`,
                    )}
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleSaveRisk(rc, e.currentTarget)
                  }}
                  className="lg:col-span-8 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Skor Min', 'Min Score')}
                      </label>
                      <input
                        name="min_score"
                        type="number"
                        min={1}
                        max={25}
                        required
                        defaultValue={rc.min_score}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Skor Maks', 'Max Score')}
                      </label>
                      <input
                        name="max_score"
                        type="number"
                        min={1}
                        max={25}
                        required
                        defaultValue={rc.max_score}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Respon (jam)', 'Response (hrs)')}
                      </label>
                      <input
                        name="first_response_hours"
                        type="number"
                        min={1}
                        required
                        defaultValue={rc.first_response_hours}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Sementara (jam)', 'Temporary (hrs)')}
                      </label>
                      <input
                        name="temporary_action_hours"
                        type="number"
                        min={1}
                        required
                        defaultValue={rc.temporary_action_hours}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-1.5">
                      <label className="block text-[13px] font-semibold text-[var(--text)]">
                        {pick('Permanen (jam)', 'Permanent (hrs)')}
                      </label>
                      <input
                        name="permanent_action_hours"
                        type="number"
                        min={1}
                        required
                        defaultValue={rc.permanent_action_hours}
                        className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-[14px] text-[var(--text)]">
                    <input
                      type="checkbox"
                      name="requires_preventive_action"
                      defaultChecked={rc.requires_preventive_action}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span>
                      {pick(
                        'Wajib tindakan Preventif sebelum kasus ditutup',
                        'Require Preventive action before closing case',
                      )}
                    </span>
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    {savedId === rc.id && (
                      <span className="text-[13px] text-[var(--safety-safe-foreground)]">
                        {pick('Tersimpan', 'Saved')}
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={savingId === rc.id}
                      className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer"
                    >
                      {savingId === rc.id ? pick('Menyimpan...', 'Saving...') : pick('Simpan', 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>

          {/* General Organization Rules Section */}
          <div className="border-t border-[var(--rule)] pt-7 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-4 space-y-1.5">
              <h2 className="text-[16px] font-semibold text-[var(--text)]">
                {pick('Aturan Umum & Pengingat Darurat', 'General Rules & Emergency Reminder')}
              </h2>
              <p className="text-[14px] text-[var(--muted)]">
                {pick(
                  'Pengaturan jendela kasus terbuka, ambang mesin berulang, dan teks pengingat prosedur darurat K3.',
                  'Settings for open case warning window, recurring machine threshold, and EHS emergency procedure reminder text.',
                )}
              </p>
            </div>

            <form
              onSubmit={handleSaveGeneralConfigs}
              className="lg:col-span-8 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-[var(--text)]">
                    {pick('Peringatan Kasus Terbuka (hari)', 'Open Case Warning (days)')}
                  </label>
                  <input
                    name="open_case_warning_days"
                    type="number"
                    min={1}
                    max={90}
                    required
                    defaultValue={Number(configs.open_case_warning_days ?? 7)}
                    className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-[var(--text)]">
                    {pick('Ambang Mesin Berulang (kasus)', 'Recurring Threshold (cases)')}
                  </label>
                  <input
                    name="recurring_case_threshold"
                    type="number"
                    min={2}
                    max={50}
                    required
                    defaultValue={Number(configs.recurring_case_threshold ?? 3)}
                    className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-[var(--text)]">
                    {pick('Rentang Mesin Berulang (hari)', 'Recurring Window (days)')}
                  </label>
                  <input
                    name="recurring_window_days"
                    type="number"
                    min={7}
                    max={365}
                    required
                    defaultValue={Number(configs.recurring_window_days ?? 90)}
                    className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 font-mono text-[14px] text-[var(--text)] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  {pick(
                    'Teks Pengingat Prosedur Darurat (Insiden + Pekerja Terdampak)',
                    'Emergency Procedure Reminder Text (Incident + Affected Workers)',
                  )}
                </label>
                <textarea
                  name="emergency_reminder_text"
                  rows={2}
                  required
                  defaultValue={String(
                    configs.emergency_reminder_text ??
                      'Ikuti prosedur darurat perusahaan terlebih dahulu. SafetyLog bukan pengganti prosedur resmi K3.',
                  )}
                  className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                {savedOrgConfig && (
                  <span className="text-[13px] text-[var(--safety-safe-foreground)]">
                    {pick('Tersimpan', 'Saved')}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingOrgConfig}
                  className="h-11 w-full sm:w-auto rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {savingOrgConfig
                    ? pick('Menyimpan...', 'Saving...')
                    : pick('Simpan Aturan Umum', 'Save General Rules')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
