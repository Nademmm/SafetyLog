import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  FileText,
  Lock,
  MapPin,
  Power,
  ShieldAlert,
  Tag,
  User,
  UserCheck,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import {
  localize6MCategory,
  localizeAreaName,
  localizeCaseStatusLabel,
  localizeCaseTypeName,
  localizeContentText,
  localizeMachineName,
  useLanguage,
} from '@/lib/i18n-helpers'
import { AuthorizedImage } from '@/components/safety/AuthorizedImage'
import { CaseStatusPill, RiskPill } from '@/components/safety/StatusPill'
import type { SafetyCase } from '@/types/safetylog'

export function CaseHeaderSection({
  caseData,
  onBack,
}: {
  caseData: SafetyCase
  onBack: () => void
}) {
  const { lang, pick } = useLanguage()
  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13.5px] font-medium text-[var(--text)] hover:bg-[var(--raised)] hover:border-[var(--muted)] active:scale-[0.99] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <span>{pick('Kembali', 'Back')}</span>
        </button>

        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-[5px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[13px] font-bold tracking-tight text-[var(--accent)] tabular-nums">
              {caseData.case_number}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <CaseStatusPill
                status={caseData.status}
                label={caseData.status_label}
                className="px-2.5 py-1 text-[12px] font-semibold"
              />
              {caseData.risk_assessment.risk_level && (
                <RiskPill
                  level={caseData.risk_assessment.risk_level}
                  score={caseData.risk_assessment.risk_score}
                  label={caseData.risk_assessment.risk_level_label}
                  className="px-2.5 py-1 text-[12px] font-semibold"
                />
              )}
              {caseData.is_locked && (
                <span className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--control)] bg-[var(--raised)] px-2.5 py-1 text-[12px] font-medium text-[var(--muted)]">
                  <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {pick('Terkunci', 'Locked')}
                </span>
              )}
            </div>
          </div>

          <h1 className="text-[20px] sm:text-[24px] font-semibold leading-snug tracking-tight text-[var(--text)]">
            {caseData.machine
              ? `${caseData.machine.code} — ${localizeMachineName(lang, caseData.machine.name, caseData.machine.code)}`
              : pick('Detail Kasus', 'Case Details')}
          </h1>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--rule)] pt-3 text-[12.5px] sm:text-[13px] text-[var(--muted)]">
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
              <dd className="truncate">
                <span className="font-medium text-[var(--text)]">
                  {localizeAreaName(lang, caseData.area?.name, caseData.area?.code) || 'Area'}
                </span>
                {caseData.area?.pic_user && (
                  <span className="text-[var(--faint)]">
                    {' '}· PIC {caseData.area.pic_user.name}
                  </span>
                )}
              </dd>
            </div>

            {caseData.case_type?.name && (
              <div className="inline-flex items-center gap-1.5 min-w-0">
                <Tag className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
                <dd className="truncate">
                  {localizeCaseTypeName(lang, caseData.case_type.name, caseData.case_type.code)}
                </dd>
              </div>
            )}

            {caseData.reporter?.name && (
              <div className="inline-flex items-center gap-1.5 min-w-0">
                <User className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
                <dd className="truncate">{caseData.reporter.name}</dd>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 min-w-0">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
              <dd className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                {formatDateTime(caseData.reported_at)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {caseData.status === 'rejected' && (
        <div className="rounded-[8px] border border-[var(--control)] bg-[var(--raised)] p-4 space-y-1">
          <div className="text-[13px] font-semibold text-[var(--text)]">{pick('Kasus Ditolak', 'Case Rejected')}</div>
          <p className="text-[13px] text-[var(--muted)]">
            {pick('Alasan', 'Reason')}: {localizeContentText(lang, caseData.risk_assessment.rejection_reason) || pick('Tidak ada catatan alasan.', 'No reason provided.')}
          </p>
        </div>
      )}

      {caseData.status === 'duplicate' && (
        <div className="rounded-[8px] border border-[var(--control)] bg-[var(--raised)] p-4 space-y-1.5">
          <div className="text-[13px] font-semibold text-[var(--text)]">
            {pick('Kasus Ditandai sebagai Duplikat', 'Case Marked as Duplicate')}
          </div>
          {caseData.risk_assessment.duplicate_of && (
            <div className="text-[13px] text-[var(--muted)]">
              {pick('Kasus rujukan', 'Reference case')}:{' '}
              <Link
                to={`/cases/${caseData.risk_assessment.duplicate_of.id}`}
                className="font-mono font-semibold text-[var(--accent)] hover:underline"
              >
                {caseData.risk_assessment.duplicate_of.case_number}
              </Link>{' '}
              ({localizeCaseStatusLabel(
                lang,
                caseData.risk_assessment.duplicate_of.status_label,
                caseData.risk_assessment.duplicate_of.status,
              )})
            </div>
          )}
          {caseData.risk_assessment.rejection_reason && (
            <p className="text-[13px] text-[var(--muted)]">
              {pick('Catatan', 'Notes')}: {localizeContentText(lang, caseData.risk_assessment.rejection_reason)}
            </p>
          )}
        </div>
      )}

      {caseData.verification.reopen_reason && caseData.status !== 'closed' && (
        <div className="rounded-[8px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-4 space-y-1 text-[13px] text-[var(--safety-warning-foreground)]">
          <div className="font-semibold">{pick('Kasus Ini Pernah Dibuka Ulang', 'This Case Was Reopened')}</div>
          <p>
            {pick('Alasan', 'Reason')}: {localizeContentText(lang, caseData.verification.reopen_reason)}
            {caseData.verification.reopened_by
              ? ` · ${pick('Oleh', 'By')} ${caseData.verification.reopened_by.name} (${formatDateTime(caseData.verification.reopened_at)})`
              : ''}
          </p>
        </div>
      )}
    </>
  )
}

export function CaseIncidentDetailsSection({ caseData }: { caseData: SafetyCase }) {
  const { lang, pick } = useLanguage()
  return (
    <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-[var(--text)]">{pick('Laporan Kejadian', 'Incident Report')}</h2>
        </div>
        {(caseData.is_machine_stopped || caseData.has_affected_people) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--safety-danger-foreground)]">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {pick('Prioritas Kritis', 'Critical Priority')}
          </span>
        )}
      </div>

      <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3.5 sm:p-4 space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
          {pick('Kronologi / Deskripsi Masalah', 'Chronology / Problem Description')}
        </div>
        <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-[var(--text)]">
          {localizeContentText(lang, caseData.description)}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
          {pick('Informasi Detail Kondisi & Penanggung Jawab', 'Condition Details & Person in Charge')}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            className={`flex items-start gap-3 rounded-[6px] border p-3 ${
              caseData.is_machine_stopped
                ? 'border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)]'
                : 'border-[var(--rule)] bg-[var(--ground)]'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border ${
                caseData.is_machine_stopped
                  ? 'border-[var(--safety-danger-border)] bg-[var(--surface)] text-[var(--safety-danger-foreground)]'
                  : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              <Power className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  caseData.is_machine_stopped
                    ? 'text-[var(--safety-danger-foreground)] opacity-85'
                    : 'text-[var(--faint)]'
                }`}
              >
                {pick('Status Mesin Berhenti', 'Machine Stop Status')}
              </dt>
              <dd
                className={`text-[14px] font-semibold ${
                  caseData.is_machine_stopped
                    ? 'text-[var(--safety-danger-foreground)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {caseData.is_machine_stopped
                  ? pick('Ya — Mesin Dihentikan', 'Yes — Machine Stopped')
                  : pick('Tidak — Tetap Beroperasi', 'No — Still Operating')}
              </dd>
            </div>
          </div>

          <div
            className={`flex items-start gap-3 rounded-[6px] border p-3 ${
              caseData.has_affected_people
                ? 'border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)]'
                : 'border-[var(--rule)] bg-[var(--ground)]'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border ${
                caseData.has_affected_people
                  ? 'border-[var(--safety-danger-border)] bg-[var(--surface)] text-[var(--safety-danger-foreground)]'
                  : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  caseData.has_affected_people
                    ? 'text-[var(--safety-danger-foreground)] opacity-85'
                    : 'text-[var(--faint)]'
                }`}
              >
                {pick('Orang Terdampak / Korban', 'Affected People / Casualties')}
              </dt>
              <dd
                className={`text-[14px] font-semibold ${
                  caseData.has_affected_people
                    ? 'text-[var(--safety-danger-foreground)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {caseData.has_affected_people
                  ? pick('Ya — Ada Orang Terdampak', 'Yes — People Affected')
                  : pick('Tidak Ada', 'None')}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                {pick('PIC Area', 'Area PIC')}
              </dt>
              <dd className="text-[14px] font-semibold text-[var(--text)] truncate">
                {caseData.area?.pic_user?.name || pick('Belum ditentukan', 'Not assigned')}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--accent)]">
              <User className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                {pick('PIC Kasus', 'Case PIC')}
              </dt>
              <dd className="text-[14px] font-semibold text-[var(--text)] truncate">
                {caseData.risk_assessment.assigned_pic?.name || pick('Belum ditunjuk', 'Not assigned')}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {(caseData.attachments?.length ?? 0) > 0 && (
        <div className="space-y-2.5 border-t border-[var(--rule)] pt-4">
          <div className="text-[12px] font-medium text-[var(--faint)]">
            {pick(
              `Foto Lampiran (${caseData.attachments!.length}) · Ketuk foto untuk membuka ukuran penuh`,
              `Photo Attachments (${caseData.attachments!.length}) · Tap photo to open full size`,
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {caseData.attachments!.map((att) => (
              <AuthorizedImage
                key={att.id}
                attachmentId={att.id}
                alt={att.file_name}
                className="h-32 w-full rounded-[6px] object-cover border border-[var(--control)]"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export function CaseRootCauseSection({ caseData }: { caseData: SafetyCase }) {
  const { lang, pick } = useLanguage()
  if (!caseData.root_cause.root_cause_category) return null

  return (
    <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--text)]">
          {pick('Analisis Akar Penyebab (5 Why & 6M)', 'Root Cause Analysis (5 Why & 6M)')}
        </h2>
        {caseData.root_cause.analyzed_by?.name && (
          <span className="text-[12px] text-[var(--faint)]">
            {pick('Diisi oleh PIC', 'Filled by PIC')}: {caseData.root_cause.analyzed_by.name}
          </span>
        )}
      </div>
      <div className="space-y-2 text-[14px]">
        <div className="text-[var(--muted)]">
          {pick('Kategori 6M', '6M Category')}:{' '}
          <strong className="text-[var(--text)]">
            {localize6MCategory(lang, caseData.root_cause.root_cause_category)}
          </strong>
        </div>
        {(caseData.root_cause.five_whys ?? []).map((w, i) => (
          <div key={i} className="text-[var(--muted)]">
            <span className="font-mono text-[12px] text-[var(--faint)] mr-1.5 tabular-nums">
              {i + 1}.
            </span>
            {localizeContentText(lang, w)}
          </div>
        ))}
        {caseData.root_cause.root_cause_summary && (
          <div className="rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 py-2 text-[13px] text-[var(--text)]">
            <span className="text-[var(--faint)]">{pick('Ringkasan', 'Summary')}: </span>
            {localizeContentText(lang, caseData.root_cause.root_cause_summary)}
          </div>
        )}
      </div>
    </section>
  )
}
