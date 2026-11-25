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
  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13.5px] font-medium text-[var(--text)] hover:bg-[var(--raised)] hover:border-[var(--muted)] active:scale-[0.99] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <span>Kembali</span>
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
                  Terkunci
                </span>
              )}
            </div>
          </div>

          <h1 className="text-[20px] sm:text-[24px] font-semibold leading-snug tracking-tight text-[var(--text)]">
            {caseData.machine
              ? `${caseData.machine.code} — ${caseData.machine.name}`
              : 'Detail Kasus'}
          </h1>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--rule)] pt-3 text-[12.5px] sm:text-[13px] text-[var(--muted)]">
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" aria-hidden="true" />
              <dd className="truncate">
                <span className="font-medium text-[var(--text)]">
                  {caseData.area?.name || 'Area'}
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
                <dd className="truncate">{caseData.case_type.name}</dd>
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
          <div className="text-[13px] font-semibold text-[var(--text)]">Kasus Ditolak</div>
          <p className="text-[13px] text-[var(--muted)]">
            Alasan: {caseData.risk_assessment.rejection_reason || 'Tidak ada catatan alasan.'}
          </p>
        </div>
      )}

      {caseData.status === 'duplicate' && (
        <div className="rounded-[8px] border border-[var(--control)] bg-[var(--raised)] p-4 space-y-1.5">
          <div className="text-[13px] font-semibold text-[var(--text)]">
            Kasus Ditandai sebagai Duplikat
          </div>
          {caseData.risk_assessment.duplicate_of && (
            <div className="text-[13px] text-[var(--muted)]">
              Kasus rujukan:{' '}
              <Link
                to={`/cases/${caseData.risk_assessment.duplicate_of.id}`}
                className="font-mono font-semibold text-[var(--accent)] hover:underline"
              >
                {caseData.risk_assessment.duplicate_of.case_number}
              </Link>{' '}
              ({caseData.risk_assessment.duplicate_of.status_label})
            </div>
          )}
          {caseData.risk_assessment.rejection_reason && (
            <p className="text-[13px] text-[var(--muted)]">
              Catatan: {caseData.risk_assessment.rejection_reason}
            </p>
          )}
        </div>
      )}

      {caseData.verification.reopen_reason && caseData.status !== 'closed' && (
        <div className="rounded-[8px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-4 space-y-1 text-[13px] text-[var(--safety-warning-foreground)]">
          <div className="font-semibold">Kasus Ini Pernah Dibuka Ulang</div>
          <p>
            Alasan: {caseData.verification.reopen_reason}
            {caseData.verification.reopened_by
              ? ` · Oleh ${caseData.verification.reopened_by.name} (${formatDateTime(caseData.verification.reopened_at)})`
              : ''}
          </p>
        </div>
      )}
    </>
  )
}

export function CaseIncidentDetailsSection({ caseData }: { caseData: SafetyCase }) {
  return (
    <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-[var(--text)]">Laporan Kejadian</h2>
        </div>
        {(caseData.is_machine_stopped || caseData.has_affected_people) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--safety-danger-foreground)]">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            Prioritas Kritis
          </span>
        )}
      </div>

      <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3.5 sm:p-4 space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
          Kronologi / Deskripsi Masalah
        </div>
        <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-[var(--text)]">
          {caseData.description}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
          Informasi Detail Kondisi &amp; Penanggung Jawab
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
                Status Mesin Berhenti
              </dt>
              <dd
                className={`text-[14px] font-semibold ${
                  caseData.is_machine_stopped
                    ? 'text-[var(--safety-danger-foreground)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {caseData.is_machine_stopped ? 'Ya — Mesin Dihentikan' : 'Tidak — Tetap Beroperasi'}
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
                Orang Terdampak / Korban
              </dt>
              <dd
                className={`text-[14px] font-semibold ${
                  caseData.has_affected_people
                    ? 'text-[var(--safety-danger-foreground)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {caseData.has_affected_people ? 'Ya — Ada Orang Terdampak' : 'Tidak Ada'}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--muted)]">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                PIC Area
              </dt>
              <dd className="text-[14px] font-semibold text-[var(--text)] truncate">
                {caseData.area?.pic_user?.name || 'Belum ditentukan'}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--accent)]">
              <User className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                PIC Kasus
              </dt>
              <dd className="text-[14px] font-semibold text-[var(--text)] truncate">
                {caseData.risk_assessment.assigned_pic?.name || 'Belum ditunjuk'}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {(caseData.attachments?.length ?? 0) > 0 && (
        <div className="space-y-2.5 border-t border-[var(--rule)] pt-4">
          <div className="text-[12px] font-medium text-[var(--faint)]">
            Foto Lampiran ({caseData.attachments!.length}) · Ketuk foto untuk membuka ukuran penuh
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
  if (!caseData.root_cause.root_cause_category) return null

  return (
    <section className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--text)]">
          Analisis Akar Penyebab (5 Why &amp; 6M)
        </h2>
        {caseData.root_cause.analyzed_by?.name && (
          <span className="text-[12px] text-[var(--faint)]">
            Diisi oleh PIC: {caseData.root_cause.analyzed_by.name}
          </span>
        )}
      </div>
      <div className="space-y-2 text-[14px]">
        <div className="text-[var(--muted)]">
          Kategori 6M:{' '}
          <strong className="text-[var(--text)]">
            {caseData.root_cause.root_cause_category}
          </strong>
        </div>
        {(caseData.root_cause.five_whys ?? []).map((w, i) => (
          <div key={i} className="text-[var(--muted)]">
            <span className="font-mono text-[12px] text-[var(--faint)] mr-1.5 tabular-nums">
              {i + 1}.
            </span>
            {w}
          </div>
        ))}
        {caseData.root_cause.root_cause_summary && (
          <div className="rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 py-2 text-[13px] text-[var(--text)]">
            <span className="text-[var(--faint)]">Ringkasan: </span>
            {caseData.root_cause.root_cause_summary}
          </div>
        )}
      </div>
    </section>
  )
}
