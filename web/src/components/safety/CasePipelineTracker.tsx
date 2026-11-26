import * as React from 'react'
import {
  Check,
  FilePlus2,
  Gauge,
  Lock,
  SearchCheck,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/lib/i18n-helpers'
import type { SafetyCase } from '@/types/safetylog'

interface CasePipelineTrackerProps {
  caseData: SafetyCase
}

interface StageDef {
  key: string
  shortLabel: string
  shortLabelEn: string
  hint: string
  hintEn: string
  icon: typeof FilePlus2
}

const STAGES: StageDef[] = [
  { key: 'new', shortLabel: 'Baru', shortLabelEn: 'New', hint: 'Laporan masuk, menunggu triase Supervisor.', hintEn: 'Report received, awaiting Supervisor triage.', icon: FilePlus2 },
  { key: 'assessed', shortLabel: 'Dinilai', shortLabelEn: 'Assessed', hint: 'Menunggu penilaian risiko & penunjukan PIC oleh Supervisor.', hintEn: 'Awaiting risk assessment & PIC assignment.', icon: Gauge },
  { key: 'analyzed', shortLabel: 'Dianalisis', shortLabelEn: 'Analyzed', hint: 'Menunggu analisis akar masalah (5W & 6M) oleh PIC.', hintEn: 'Awaiting root cause analysis (5W & 6M) by PIC.', icon: SearchCheck },
  { key: 'in_progress', shortLabel: 'Tindakan', shortLabelEn: 'CAPA', hint: 'Menunggu pelaksanaan tindakan perbaikan (CAPA).', hintEn: 'Awaiting CAPA execution.', icon: Wrench },
  { key: 'pending_verification', shortLabel: 'Verifikasi', shortLabelEn: 'Verify', hint: 'Menunggu verifikasi independen K3.', hintEn: 'Awaiting independent HSE verification.', icon: ShieldCheck },
  { key: 'closed', shortLabel: 'Selesai', shortLabelEn: 'Closed', hint: 'Menunggu penutupan & penguncian kasus.', hintEn: 'Awaiting case closure & lock.', icon: Lock },
]

export function CasePipelineTracker({ caseData }: CasePipelineTrackerProps) {
  const { pick } = useLanguage()
  const rawIndex = STAGES.findIndex((s) => s.key === caseData.status)
  const currentIndex = rawIndex >= 0 ? rawIndex : 0
  const currentCaseKey = `${caseData.id}-${caseData.status}`
  const [selectedState, setSelectedState] = React.useState<{ caseKey: string; index: number | null }>({
    caseKey: currentCaseKey,
    index: null,
  })
  const selectedIndex = selectedState.caseKey === currentCaseKey ? selectedState.index : null
  const setSelectedIndex = (index: number | null) => setSelectedState({ caseKey: currentCaseKey, index })

  if (caseData.status === 'rejected' || caseData.status === 'duplicate') {
    return null
  }

  const isClosed = caseData.status === 'closed'
  const inspectIndex = selectedIndex ?? currentIndex
  const inspectedStage = STAGES[inspectIndex]
  const totalActions = caseData.actions?.length ?? 0
  const completedActions = (caseData.actions ?? []).filter((a) => a.status === 'completed').length

  const progressRatio = isClosed ? 1 : (currentIndex + 1) / STAGES.length
  const trackPercent = (currentIndex / (STAGES.length - 1)) * 100

  // SVG circular progress ring geometry
  const ringRadius = 12
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - progressRatio)

  const getStageDetail = (idx: number): { text: string; meta: string | null } => {
    const stage = STAGES[idx]
    const stageHint = pick(stage.hint, stage.hintEn)
    switch (stage.key) {
      case 'new':
        return {
          text: caseData.reporter?.name
            ? pick(`Dilaporkan oleh ${caseData.reporter.name}`, `Reported by ${caseData.reporter.name}`)
            : stageHint,
          meta: formatDateTime(caseData.reported_at),
        }
      case 'assessed':
        return caseData.risk_assessment.triaged_at
          ? {
              text: pick(
                `Dinilai oleh ${caseData.risk_assessment.triaged_by?.name || 'Supervisor'}`,
                `Assessed by ${caseData.risk_assessment.triaged_by?.name || 'Supervisor'}`,
              ),
              meta: formatDateTime(caseData.risk_assessment.triaged_at),
            }
          : { text: stageHint, meta: null }
      case 'analyzed':
        return caseData.root_cause.analyzed_at
          ? {
              text: pick(
                `Dianalisis oleh ${caseData.root_cause.analyzed_by?.name || 'PIC'}`,
                `Analyzed by ${caseData.root_cause.analyzed_by?.name || 'PIC'}`,
              ) +
                (caseData.root_cause.root_cause_category
                  ? ` (${caseData.root_cause.root_cause_category})`
                  : ''),
              meta: formatDateTime(caseData.root_cause.analyzed_at),
            }
          : { text: stageHint, meta: null }
      case 'in_progress':
        return totalActions > 0
          ? {
              text: pick(
                `${completedActions} dari ${totalActions} tindakan CAPA selesai`,
                `${completedActions} of ${totalActions} CAPA actions completed`,
              ),
              meta:
                completedActions === totalActions
                  ? pick('Tuntas', 'Done')
                  : pick('Berjalan', 'In Progress'),
            }
          : { text: stageHint, meta: null }
      case 'pending_verification':
        return caseData.verification.verified_at
          ? {
              text: pick(
                `Diverifikasi oleh ${caseData.verification.verified_by?.name || 'K3'}`,
                `Verified by ${caseData.verification.verified_by?.name || 'HSE'}`,
              ),
              meta: formatDateTime(caseData.verification.verified_at),
            }
          : { text: stageHint, meta: null }
      case 'closed':
        return caseData.verification.closed_at
          ? {
              text: pick('Ditutup & terkunci permanen', 'Closed & permanently locked'),
              meta: formatDateTime(caseData.verification.closed_at),
            }
          : { text: stageHint, meta: null }
      default:
        return { text: stageHint, meta: null }
    }
  }

  const detail = getStageDetail(inspectIndex)
  const isInspectingOther = selectedIndex !== null && selectedIndex !== currentIndex

  return (
    <section
      aria-label="Progres penanganan kasus"
      className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4 space-y-3"
    >
      {/* Header Row: Label & Stage on Left, Progress Ring "1/6" on Right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {pick('Alur Penanganan', 'Case Pipeline')}
          </span>
          <span className="text-[var(--faint)]">·</span>
          <span className="font-semibold text-[13px] text-[var(--text)] truncate">
            {pick(inspectedStage.shortLabel, inspectedStage.shortLabelEn)}
          </span>
        </div>

        {/* Sleek Progress Badge with Circular Progress Ring (Lebar & Tegas) */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] py-1 pl-1.5 pr-3 shadow-2xs"
          title={`Tahap ${currentIndex + 1} dari ${STAGES.length}`}
        >
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
            <svg className="h-7 w-7 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
              <circle
                cx="16"
                cy="16"
                r={ringRadius}
                fill="none"
                stroke="var(--control)"
                strokeWidth="2.6"
              />
              <circle
                cx="16"
                cy="16"
                r={ringRadius}
                fill="none"
                stroke={isClosed ? 'var(--safety-safe)' : 'var(--accent)'}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            {isClosed && (
              <span className="absolute text-[11px] font-bold text-[var(--safety-safe)]">
                ✓
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] tabular-nums tracking-tight">
              {isClosed ? pick('Tuntas', 'Done') : `${currentIndex + 1}/${STAGES.length}`}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              {isClosed ? '' : pick('tahap', 'step')}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Node Rail (Full Width with plenty of room) */}
      <div className="relative w-full">
        {/* Continuous Track Behind Nodes */}
        <div
          aria-hidden="true"
          className="absolute left-4 right-4 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[var(--control)] overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isClosed ? 'bg-[var(--safety-safe)]' : 'bg-[var(--accent)]'
            }`}
            style={{ width: `${trackPercent}%` }}
          />
        </div>

        {/* 6 Interactive Nodes */}
        <ol className="relative flex items-center justify-between">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon
            const done = idx < currentIndex || (isClosed && idx === currentIndex)
            const active = idx === currentIndex && !isClosed
            const isSelected = inspectIndex === idx

            return (
              <li key={stage.key} className="relative z-10 flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedIndex(idx === currentIndex ? null : idx)}
                  aria-label={`Tahap ${idx + 1}: ${stage.shortLabel}`}
                  aria-current={active ? 'step' : undefined}
                  aria-pressed={isSelected}
                  title={stage.shortLabel}
                  className="group inline-flex min-h-[44px] min-w-[36px] sm:min-w-[44px] items-center justify-center rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full border transition-all duration-200 ${
                      active
                        ? 'h-8 sm:h-9 px-2.5 sm:px-3 gap-1.5 border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-sm'
                        : done
                          ? isClosed
                            ? 'h-7 w-7 sm:h-9 sm:w-9 border-[var(--safety-safe)] bg-[var(--safety-safe)] text-white group-hover:scale-105'
                            : 'h-7 w-7 sm:h-9 sm:w-9 border-[var(--accent)] bg-[var(--raised)] text-[var(--accent)] group-hover:scale-105'
                          : 'h-7 w-7 sm:h-9 sm:w-9 border-[var(--control)] bg-[var(--ground)] text-[var(--faint)] group-hover:border-[var(--muted)] group-hover:text-[var(--muted)]'
                    } ${
                      isSelected && !active
                        ? 'ring-2 ring-[var(--accent)]/40 scale-105'
                        : ''
                    }`}
                  >
                    {active ? (
                      <>
                        <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.2px]" aria-hidden="true" />
                        <span className="text-[12px] sm:text-[13px] whitespace-nowrap">
                          {pick(stage.shortLabel, stage.shortLabelEn)}
                        </span>
                      </>
                    ) : done ? (
                      <Check className="h-3.5 w-3.5 stroke-[2.6px]" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 stroke-[1.8px]" />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Interactive Stage Detail Strip */}
      <div className="flex flex-col gap-2 border-t border-[var(--rule)] pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <span
            className={`inline-flex shrink-0 items-center rounded-[5px] px-2 py-0.5 text-[11.5px] font-semibold ${
              inspectIndex < currentIndex || isClosed
                ? 'bg-[var(--safety-safe-bg)] text-[var(--safety-safe-foreground)]'
                : inspectIndex === currentIndex
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'bg-[var(--raised)] text-[var(--muted)]'
            }`}
          >
            {pick(inspectedStage.shortLabel, inspectedStage.shortLabelEn)}
          </span>
          <span className="text-[13px] leading-snug text-[var(--muted)]">{detail.text}</span>
        </div>

        {(detail.meta || isInspectingOther) && (
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            {detail.meta && (
              <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                {detail.meta}
              </span>
            )}
            {isInspectingOther && (
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="inline-flex min-h-[36px] sm:min-h-[44px] items-center rounded-[5px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2.5 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] cursor-pointer transition-colors"
              >
                {pick('Ke tahap aktif', 'To active step')}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
