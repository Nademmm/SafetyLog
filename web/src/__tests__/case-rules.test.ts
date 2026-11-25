import { describe, expect, it } from 'vitest'
import {
  canCloseCaseByPreventiveRule,
  canUserVerifyCase,
  getDefaultReopenActionIds,
  getDuplicateCandidates,
  hasCompletedPreventiveAction,
  sortMyActionsByPriority,
  toLocalDateTimeInput,
} from '@/domain/case-rules'
import type { CaseAction, SafetyCase } from '@/types/safetylog'

function makeAction(overrides: Partial<CaseAction> = {}): CaseAction {
  return {
    id: 1,
    safety_case_id: 100,
    action_type: 'corrective',
    action_type_label: 'Korektif',
    title: 'Perbaiki sensor',
    description: null,
    pic: {
      id: 10,
      name: 'Budi',
      email: 'budi@safetylog.test',
      role: 'reporter',
      role_label: 'Pelapor',
      job_title: null,
    },
    due_at: '2026-11-26T10:00:00Z',
    status: 'open',
    status_label: 'Terbuka',
    is_overdue: false,
    overdue_label: null,
    completion_note: null,
    completed_at: null,
    can_complete: false,
    ...overrides,
  }
}

describe('case-rules', () => {
  it('enforces AGENTS.md Rule #4: Medium/High risk requires completed preventive action', () => {
    const openPreventive = [makeAction({ action_type: 'preventive', status: 'open' })]
    const doneCorrective = [makeAction({ action_type: 'corrective', status: 'completed' })]
    const donePreventive = [makeAction({ action_type: 'preventive', status: 'completed' })]

    expect(canCloseCaseByPreventiveRule('low', doneCorrective)).toBe(true)
    expect(canCloseCaseByPreventiveRule('medium', openPreventive)).toBe(false)
    expect(canCloseCaseByPreventiveRule('high', doneCorrective)).toBe(false)
    expect(canCloseCaseByPreventiveRule('high', donePreventive)).toBe(true)
    expect(hasCompletedPreventiveAction(donePreventive)).toBe(true)
  })

  it('enforces AGENTS.md Rule #3: Verifier cannot be the same person as PIC (including Admin)', () => {
    const actions = [
      makeAction({
        pic: {
          id: 7,
          name: 'Andi',
          email: 'andi@safetylog.test',
          role: 'reporter',
          role_label: 'Pelapor',
          job_title: null,
        },
      }),
    ]
    expect(canUserVerifyCase(7, 'hse', actions)).toBe(false)
    expect(canUserVerifyCase(7, 'admin', actions)).toBe(false)
    expect(canUserVerifyCase(8, 'hse', actions)).toBe(true)
    expect(canUserVerifyCase(8, 'admin', actions)).toBe(true)
    expect(canUserVerifyCase(8, 'supervisor', actions)).toBe(false)
    expect(canUserVerifyCase(8, 'reporter', actions)).toBe(false)
  })

  it('sorts actions with open overdue first, then open by due date, then completed', () => {
    const sorted = sortMyActionsByPriority([
      makeAction({ id: 1, status: 'completed', due_at: '2026-11-20T00:00:00Z' }),
      makeAction({ id: 2, status: 'open', is_overdue: false, due_at: '2026-11-28T00:00:00Z' }),
      makeAction({ id: 3, status: 'open', is_overdue: true, due_at: '2026-11-24T00:00:00Z' }),
      makeAction({ id: 4, status: 'open', is_overdue: false, due_at: '2026-11-26T00:00:00Z' }),
    ])
    expect(sorted.map((a) => a.id)).toEqual([3, 4, 2, 1])
  })

  it('filters out self and existing duplicates from duplicate candidates', () => {
    const cases = [
      { id: 1, status: 'new' },
      { id: 2, status: 'duplicate' },
      { id: 3, status: 'in_progress' },
    ] as SafetyCase[]
    expect(getDuplicateCandidates(cases, 1).map((c) => c.id)).toEqual([3])
  })

  it('preselects the sole completed action for reopen defaults', () => {
    expect(getDefaultReopenActionIds([makeAction({ id: 5, status: 'completed' })])).toEqual([5])
    expect(
      getDefaultReopenActionIds([
        makeAction({ id: 5, status: 'completed' }),
        makeAction({ id: 6, status: 'completed' }),
      ]),
    ).toEqual([])
  })

  it('formats valid ISO strings for datetime-local inputs and handles invalid values safely', () => {
    expect(toLocalDateTimeInput(null)).toBe('')
    expect(toLocalDateTimeInput('not-a-date')).toBe('')
    expect(toLocalDateTimeInput('2026-11-25T08:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})
