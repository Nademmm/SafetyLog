import type { CaseAction, RiskLevel, SafetyCase, UserRole } from '@/types/safetylog'

export function requiresPreventiveForClosure(riskLevel?: RiskLevel | null): boolean {
  return riskLevel === 'medium' || riskLevel === 'high'
}

export function hasCompletedPreventiveAction(actions: CaseAction[]): boolean {
  return actions.some(
    (action) => action.action_type === 'preventive' && action.status === 'completed',
  )
}

/**
 * AGENTS.md Rule #4: Medium/High risk cases cannot be closed without at least
 * one completed Preventive action.
 */
export function canCloseCaseByPreventiveRule(
  riskLevel: RiskLevel | null | undefined,
  actions: CaseAction[],
): boolean {
  if (!requiresPreventiveForClosure(riskLevel)) return true
  return hasCompletedPreventiveAction(actions)
}

/**
 * AGENTS.md Rule #3: Verifier must not be the same person as any action PIC
 * (applies to all roles, including Admin).
 */
export function isUserActionPic(userId: number | undefined, actions: CaseAction[]): boolean {
  if (!userId) return false
  return actions.some((action) => action.pic?.id === userId)
}

export function canUserVerifyCase(
  userId: number | undefined,
  userRole: UserRole | undefined,
  actions: CaseAction[],
): boolean {
  if (!userId || (userRole !== 'hse' && userRole !== 'admin')) return false
  return !isUserActionPic(userId, actions)
}

export function getDuplicateCandidates(
  cases: SafetyCase[],
  currentCaseId: number,
): SafetyCase[] {
  return cases.filter((item) => item.id !== currentCaseId && item.status !== 'duplicate')
}

export function getDefaultReopenActionIds(actions: CaseAction[]): number[] {
  const completed = actions.filter((action) => action.status === 'completed')
  if (completed.length === 1) return [completed[0].id]
  return []
}

export function sortMyActionsByPriority(actions: CaseAction[]): CaseAction[] {
  return [...actions].sort((a, b) => {
    const aDone = a.status === 'completed' ? 1 : 0
    const bDone = b.status === 'completed' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone

    const aOverdue = a.is_overdue ? 0 : 1
    const bOverdue = b.is_overdue ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue

    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  })
}

export function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalDateTimeInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString()
}
