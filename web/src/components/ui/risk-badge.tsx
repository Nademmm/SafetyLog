import * as React from 'react'
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  Wrench,
  Lock,
  XCircle,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type RiskLevel = 'Tinggi' | 'Sedang' | 'Rendah' | 'high' | 'medium' | 'low'

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  level: RiskLevel
  score?: number
  showIcon?: boolean
}

/**
 * RiskBadge — K3 Standardized Risk Level Indicator
 * Compliant with ISO 7010 / ISO 3864 & ANSI Z535.
 * Strictly pairs color with a clear textual label and icon.
 */
export function RiskBadge({
  level,
  score,
  showIcon = true,
  className,
  ...props
}: RiskBadgeProps) {
  const normalized = level.toLowerCase()

  if (normalized === 'tinggi' || normalized === 'high') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border border-safety-danger-border bg-safety-danger-bg px-2.5 py-0.5 text-label font-semibold text-safety-danger-foreground select-none',
          className
        )}
        {...props}
      >
        {showIcon && <AlertTriangle className="h-4 w-4 shrink-0 text-safety-danger stroke-[2px]" />}
        <span>Tinggi</span>
        {typeof score === 'number' && (
          <span className="font-mono text-[11px] tabular-nums opacity-85">({score})</span>
        )}
      </div>
    )
  }

  if (normalized === 'sedang' || normalized === 'medium') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border border-safety-warning-border bg-safety-warning-bg px-2.5 py-0.5 text-label font-semibold text-safety-warning-foreground select-none',
          className
        )}
        {...props}
      >
        {showIcon && <AlertCircle className="h-4 w-4 shrink-0 text-safety-warning stroke-[2px]" />}
        <span>Sedang</span>
        {typeof score === 'number' && (
          <span className="font-mono text-[11px] tabular-nums opacity-85">({score})</span>
        )}
      </div>
    )
  }

  // Rendah / Low
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-safety-caution-border bg-safety-caution-bg px-2.5 py-0.5 text-label font-semibold text-safety-caution-foreground select-none',
        className
      )}
      {...props}
    >
      {showIcon && <Info className="h-4 w-4 shrink-0 text-safety-caution stroke-[2px]" />}
      <span>Rendah</span>
      {typeof score === 'number' && (
        <span className="font-mono text-[11px] tabular-nums opacity-85">({score})</span>
      )}
    </div>
  )
}

export type CaseStatus =
  | 'Baru'
  | 'Dinilai'
  | 'Dianalisis'
  | 'Tindakan berjalan'
  | 'Menunggu verifikasi'
  | 'Selesai'
  | 'Ditolak'
  | 'Duplikat'
  | 'Terlambat'

export interface CaseStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: CaseStatus
  showIcon?: boolean
}

/**
 * CaseStatusBadge — Workflow status badge for SafetyLog
 * Capture → Resolve → Learn → Prevent
 */
export function CaseStatusBadge({
  status,
  showIcon = true,
  className,
  ...props
}: CaseStatusBadgeProps) {
  switch (status) {
    case 'Baru':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-safety-info-border bg-safety-info-bg px-2.5 py-0.5 text-label font-medium text-safety-info-foreground select-none',
            className
          )}
          {...props}
        >
          {showIcon && <Clock className="h-3.5 w-3.5 shrink-0 text-safety-info stroke-[2px]" />}
          <span>Baru</span>
        </div>
      )

    case 'Dinilai':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-safety-warning-border bg-safety-warning-bg px-2.5 py-0.5 text-label font-medium text-safety-warning-foreground select-none',
            className
          )}
          {...props}
        >
          {showIcon && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-safety-warning stroke-[2px]" />}
          <span>Dinilai</span>
        </div>
      )

    case 'Dianalisis':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-safety-info-border bg-safety-info-bg px-2.5 py-0.5 text-label font-medium text-safety-info-foreground select-none',
            className
          )}
          {...props}
        >
          {showIcon && <Info className="h-3.5 w-3.5 shrink-0 text-safety-info stroke-[2px]" />}
          <span>Dianalisis</span>
        </div>
      )

    case 'Tindakan berjalan':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-charcoal-border bg-elevated px-2.5 py-0.5 text-label font-medium text-off-white select-none',
            className
          )}
          {...props}
        >
          {showIcon && <Wrench className="h-3.5 w-3.5 shrink-0 text-industrial-orange stroke-[2px]" />}
          <span>Tindakan berjalan</span>
        </div>
      )

    case 'Menunggu verifikasi':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-safety-caution-border bg-safety-caution-bg px-2.5 py-0.5 text-label font-medium text-safety-caution-foreground select-none',
            className
          )}
          {...props}
        >
          {showIcon && <Clock className="h-3.5 w-3.5 shrink-0 text-safety-caution stroke-[2px]" />}
          <span>Menunggu verifikasi</span>
        </div>
      )

    case 'Selesai':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-safety-safe-border bg-safety-safe-bg px-2.5 py-0.5 text-label font-medium text-safety-safe-foreground select-none',
            className
          )}
          {...props}
        >
          {showIcon && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-safety-safe stroke-[2px]" />}
          <span>Selesai</span>
          <Lock className="h-3 w-3 shrink-0 opacity-70 stroke-[2px]" />
        </div>
      )

    case 'Terlambat':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-safety-danger-border bg-safety-danger-bg px-2.5 py-0.5 text-label font-semibold text-safety-danger-foreground select-none',
            className
          )}
          {...props}
        >
          {showIcon && <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-safety-danger stroke-[2px]" />}
          <span>Terlambat</span>
        </div>
      )

    case 'Ditolak':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-charcoal-border bg-graphite px-2.5 py-0.5 text-label font-medium text-steel-muted select-none',
            className
          )}
          {...props}
        >
          {showIcon && <XCircle className="h-3.5 w-3.5 shrink-0 text-steel-muted stroke-[2px]" />}
          <span>Ditolak</span>
        </div>
      )

    case 'Duplikat':
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-charcoal-border bg-graphite px-2.5 py-0.5 text-label font-medium text-steel-muted select-none',
            className
          )}
          {...props}
        >
          {showIcon && <Copy className="h-3.5 w-3.5 shrink-0 text-steel-muted stroke-[2px]" />}
          <span>Duplikat</span>
        </div>
      )

    default:
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border border-charcoal-border bg-elevated px-2.5 py-0.5 text-label font-medium text-steel-muted select-none',
            className
          )}
          {...props}
        >
          <span>{status}</span>
        </div>
      )
  }
}
