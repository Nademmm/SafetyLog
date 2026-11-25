import { describe, expect, it } from 'vitest'
import { parseRootCauseCategories, unwrapQrMachine, unwrapUser } from '@/data/normalizers'
import type { Machine, User } from '@/types/safetylog'

describe('data normalizers', () => {
  it('unwraps user payload regardless of envelope shape', () => {
    const sample = { id: 1, name: 'Siti', role: 'hse' } as User
    expect(unwrapUser({ data: sample })).toEqual(sample)
    expect(unwrapUser({ user: sample })).toEqual(sample)
    expect(unwrapUser(sample)).toEqual(sample)
  })

  it('unwraps QR machine payload from either machine or data key', () => {
    const machine = { id: 4, code: 'M-04', name: 'Conveyor A' } as Machine
    expect(unwrapQrMachine({ machine })).toEqual(machine)
    expect(unwrapQrMachine({ data: machine })).toEqual(machine)
    expect(unwrapQrMachine(null)).toBeUndefined()
  })

  it('parses 6M root cause categories from array, JSON string, CSV string, or defaults', () => {
    expect(parseRootCauseCategories({ root_cause_categories_6m: ['Mesin', 'Metode'] })).toEqual([
      'Mesin',
      'Metode',
    ])
    expect(parseRootCauseCategories({ root_cause_categories: '["Manusia","Material"]' })).toEqual([
      'Manusia',
      'Material',
    ])
    expect(parseRootCauseCategories({ root_cause_categories: 'Mesin, Lingkungan' })).toEqual([
      'Mesin',
      'Lingkungan',
    ])
    expect(parseRootCauseCategories(null)).toHaveLength(6)
  })
})
