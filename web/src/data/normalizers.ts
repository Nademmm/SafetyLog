import type { Machine, User } from '@/types/safetylog'

export function unwrapUser(payload: { data?: User; user?: User } | User): User | null {
  if (!payload || typeof payload !== 'object') return null
  if ('data' in payload && payload.data && typeof payload.data === 'object' && 'id' in payload.data) {
    return payload.data
  }
  if ('user' in payload && payload.user && typeof payload.user === 'object' && 'id' in payload.user) {
    return payload.user
  }
  if ('id' in payload && 'role' in payload) {
    return payload as User
  }
  return null
}

export function unwrapQrMachine(
  payload?: { machine?: Machine; data?: Machine } | null,
): Machine | undefined {
  if (!payload) return undefined
  return payload.machine ?? payload.data
}

const DEFAULT_ROOT_CAUSE_6M = [
  'Manusia',
  'Mesin',
  'Metode',
  'Material',
  'Lingkungan',
  'Pengukuran',
]

export function parseRootCauseCategories(
  configurations?: Record<string, unknown> | null,
): string[] {
  const raw =
    configurations?.root_cause_categories_6m ?? configurations?.root_cause_categories
  if (Array.isArray(raw)) {
    const cleaned = raw.map((item) => String(item).trim()).filter(Boolean)
    return cleaned.length > 0 ? cleaned : DEFAULT_ROOT_CAUSE_6M
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((item) => String(item).trim()).filter(Boolean)
        return cleaned.length > 0 ? cleaned : DEFAULT_ROOT_CAUSE_6M
      }
    } catch {
      const split = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      if (split.length > 0) return split
    }
  }
  return DEFAULT_ROOT_CAUSE_6M
}
