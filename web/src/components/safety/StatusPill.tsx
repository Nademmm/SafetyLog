import { cn } from '@/lib/utils'
import type { CaseStatus, RiskLevel } from '@/types/safetylog'

const RISK_STYLES: Record<RiskLevel, string> = {
  high: 'bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)] border-[var(--safety-danger-border)]',
  medium: 'bg-[var(--safety-warning-bg)] text-[var(--safety-warning-foreground)] border-[var(--safety-warning-border)]',
  low: 'bg-[var(--safety-caution-bg)] text-[var(--safety-caution-foreground)] border-[var(--safety-caution-border)]',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
}

export function RiskPill({
  level,
  score,
  label,
  className,
}: {
  level: RiskLevel | null | undefined
  score?: number | null
  label?: string | null
  className?: string
}) {
  if (!level) {
    return <span className="text-xs text-[var(--faint)]">Belum dinilai</span>
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[12px] font-medium leading-4 whitespace-nowrap',
        RISK_STYLES[level],
        className,
      )}
    >
      <span>{label || RISK_LABELS[level]}</span>
      {typeof score === 'number' && (
        <span className="font-mono tabular-nums opacity-90">({score})</span>
      )}
    </span>
  )
}

const STATUS_STYLES: Record<CaseStatus, string> = {
  new: 'bg-[var(--safety-info-bg)] text-[var(--safety-info-foreground)] border-[var(--safety-info-border)]',
  assessed: 'bg-[var(--safety-info-bg)] text-[var(--safety-info-foreground)] border-[var(--safety-info-border)]',
  analyzed: 'bg-[var(--safety-info-bg)] text-[var(--safety-info-foreground)] border-[var(--safety-info-border)]',
  in_progress: 'bg-[var(--safety-warning-bg)] text-[var(--safety-warning-foreground)] border-[var(--safety-warning-border)]',
  pending_verification: 'bg-[var(--safety-caution-bg)] text-[var(--safety-caution-foreground)] border-[var(--safety-caution-border)]',
  closed: 'bg-[var(--safety-safe-bg)] text-[var(--safety-safe-foreground)] border-[var(--safety-safe-border)]',
  rejected: 'bg-[var(--raised)] text-[var(--muted)] border-[var(--control)]',
  duplicate: 'bg-[var(--raised)] text-[var(--muted)] border-[var(--control)]',
}

export function CaseStatusPill({
  status,
  label,
  className,
}: {
  status: CaseStatus
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[12px] font-medium leading-4 whitespace-nowrap',
        STATUS_STYLES[status] || 'bg-[var(--raised)] text-[var(--muted)] border-[var(--control)]',
        className,
      )}
    >
      {label || status}
    </span>
  )
}

export function OverduePill({ label = 'Terlambat' }: { label?: string | null }) {
  return (
    <span className="inline-flex items-center rounded-[4px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-2 py-0.5 text-[12px] font-medium leading-4 text-[var(--safety-danger-foreground)] whitespace-nowrap">
      {label || 'Terlambat'}
    </span>
  )
}

export function RecurringPill({ label = 'Berulang' }: { label?: string | null }) {
  return (
    <span className="inline-flex items-center rounded-[4px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] px-2 py-0.5 text-[12px] font-medium leading-4 text-[var(--safety-warning-foreground)] whitespace-nowrap">
      {label || 'Berulang'}
    </span>
  )
}

const CASE_TYPE_STYLES: Record<string, string> = {
  incident:
    'bg-[var(--safety-danger-bg)] text-[var(--safety-danger-foreground)] border-[var(--safety-danger-border)]',
  breakdown:
    'bg-[var(--safety-warning-bg)] text-[var(--safety-warning-foreground)] border-[var(--safety-warning-border)]',
  unsafe_condition:
    'bg-[var(--safety-caution-bg)] text-[var(--safety-caution-foreground)] border-[var(--safety-caution-border)]',
  machine_abnormality:
    'bg-[var(--safety-info-bg)] text-[var(--safety-info-foreground)] border-[var(--safety-info-border)]',
  near_miss:
    'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30',
}

export function CaseTypePill({
  caseType,
  className,
}: {
  caseType: { code?: string | null; name: string; is_incident?: boolean } | null | undefined
  className?: string
}) {
  if (!caseType?.name) return null
  const styleKey = caseType.is_incident ? 'incident' : (caseType.code || '')
  const styleClass =
    CASE_TYPE_STYLES[styleKey] ||
    'bg-[var(--raised)] text-[var(--text)] border-[var(--control)]'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11.5px] font-semibold leading-4 whitespace-nowrap',
        styleClass,
        className,
      )}
    >
      {caseType.name}
    </span>
  )
}
