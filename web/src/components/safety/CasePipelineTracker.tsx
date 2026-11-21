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
import type { SafetyCase } from '@/types/safetylog'

interface CasePipelineTrackerProps {
  caseData: SafetyCase
}

interface StageDef {
  key: string
  shortLabel: string
  hint: string
  icon: typeof FilePlus2
}

const STAGES: StageDef[] = [
  { key: 'new', shortLabel: 'Baru', hint: 'Laporan masuk, menunggu triase Supervisor.', icon: FilePlus2 },
  { key: 'assessed', shortLabel: 'Dinilai', hint: 'Risiko dinilai, menunggu tindakan & analisis PIC.', icon: Gauge },
  { key: 'analyzed', shortLabel: 'Dianalisis', hint: 'Akar masalah 5W & 6M tercatat oleh PIC.', icon: SearchCheck },
  { key: 'in_progress', shortLabel: 'Tindakan', hint: 'PIC sedang mengerjakan tindakan CAPA.', icon: Wrench },
  { key: 'pending_verification', shortLabel: 'Verifikasi', hint: 'Menunggu verifikasi independen K3.', icon: ShieldCheck },
  { key: 'closed', shortLabel: 'Selesai', hint: 'Kasus tuntas & terkunci.', icon: Lock },
]

export function CasePipelineTracker({ caseData }: CasePipelineTrackerProps) {
  const rawIndex = STAGES.findIndex((s) => s.key === caseData.status)
  const currentIndex = rawIndex >= 0 ? rawIndex : 0
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    setSelectedIndex(null)
  }, [caseData.id, caseData.status])

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
  const ringRadius = 15
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - progressRatio)

  const getStageDetail = (idx: number): { text: string; meta: string | null } => {
    const stage = STAGES[idx]
    switch (stage.key) {
      case 'new':
        return {
          text: caseData.reporter?.name ? `Dilaporkan oleh ${caseData.reporter.name}` : stage.hint,
          meta: formatDateTime(caseData.reported_at),
        }
      case 'assessed':
        return caseData.risk_assessment.triaged_at
          ? {
              text: `Ditriase oleh ${caseData.risk_assessment.triaged_by?.name || 'Supervisor'}`,
              meta: formatDateTime(caseData.risk_assessment.triaged_at),
            }
          : { text: stage.hint, meta: null }
      case 'analyzed':
        return caseData.root_cause.analyzed_at
          ? {
              text: `5W & 6M (${caseData.root_cause.root_cause_category || '—'}) oleh ${caseData.root_cause.analyzed_by?.name || 'PIC'}`,
              meta: formatDateTime(caseData.root_cause.analyzed_at),
            }
          : { text: stage.hint, meta: null }
      case 'in_progress':
        return totalActions > 0
          ? {
              text: `${completedActions} dari ${totalActions} tindakan CAPA selesai`,
              meta: completedActions === totalActions ? 'Tuntas' : 'Berjalan',
            }
          : { text: stage.hint, meta: null }
      case 'pending_verification':
        return caseData.verification.verified_at
          ? {
              text: `Diverifikasi oleh ${caseData.verification.verified_by?.name || 'K3'}`,
              meta: formatDateTime(caseData.verification.verified_at),
            }
          : { text: stage.hint, meta: null }
      case 'closed':
        return caseData.verification.closed_at
          ? {
              text: 'Kasus selesai & terkunci permanen',
              meta: formatDateTime(caseData.verification.closed_at),
            }
          : { text: stage.hint, meta: null }
      default:
        return { text: stage.hint, meta: null }
    }
  }

  const detail = getStageDetail(inspectIndex)
  const isInspectingOther = selectedIndex !== null && selectedIndex !== currentIndex

  return (
    <section
      aria-label="Progres penanganan kasus"
      className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:px-5 sm:py-4 space-y-3"
    >
      {/* Main Visual Row: Interactive Node Rail + Circular Progress Ring */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
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
          <ol className="relative flex items-center justify-between gap-1">
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
                    className={`group inline-flex items-center justify-center rounded-full border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      active
                        ? 'h-9 px-3 gap-1.5 border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold shadow-sm'
                        : done
                          ? isClosed
                            ? 'h-8 w-8 sm:h-9 sm:w-9 border-[var(--safety-safe)] bg-[var(--safety-safe)] text-white hover:scale-105'
                            : 'h-8 w-8 sm:h-9 sm:w-9 border-[var(--accent)] bg-[var(--raised)] text-[var(--accent)] hover:scale-105'
                          : 'h-8 w-8 sm:h-9 sm:w-9 border-[var(--control)] bg-[var(--ground)] text-[var(--faint)] hover:border-[var(--muted)] hover:text-[var(--muted)]'
                    } ${
                      isSelected && !active
                        ? 'ring-2 ring-[var(--accent)]/40 scale-105'
                        : ''
                    }`}
                  >
                    {active ? (
                      <>
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                        </span>
                        <span className="text-[12px] sm:text-[13px] whitespace-nowrap">
                          {stage.shortLabel}
                        </span>
                      </>
                    ) : done ? (
                      <Check className="h-3.5 w-3.5 stroke-[2.6px]" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 stroke-[1.8px]" />
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Minimalist SVG Circular Progress Ring */}
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center"
          title={`Tahap ${currentIndex + 1} dari ${STAGES.length}`}
        >
          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 38 38" aria-hidden="true">
            <circle
              cx="19"
              cy="19"
              r={ringRadius}
              fill="none"
              stroke="var(--control)"
              strokeWidth="2.5"
            />
            <circle
              cx="19"
              cy="19"
              r={ringRadius}
              fill="none"
              stroke={isClosed ? 'var(--safety-safe)' : 'var(--accent)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute font-mono text-[10px] font-semibold text-[var(--text)] tabular-nums">
            {isClosed ? '✓' : `${currentIndex + 1}/${STAGES.length}`}
          </span>
        </div>
      </div>

      {/* Single-Line Interactive Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[var(--rule)] pt-2.5 text-[12px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[var(--text)] shrink-0">
            {inspectedStage.shortLabel}
          </span>
          <span className="text-[var(--faint)]">·</span>
          <span className="text-[var(--muted)] truncate">{detail.text}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {detail.meta && (
            <span className="font-mono text-[11px] text-[var(--faint)] tabular-nums">
              {detail.meta}
            </span>
          )}
          {isInspectingOther && (
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
            >
              Tahap aktif
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
