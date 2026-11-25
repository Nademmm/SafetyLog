import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { referenceKeys } from '@/data/query-keys'
import type { ReferenceData } from '@/types/safetylog'

export function useReferenceData() {
  return useQuery({
    queryKey: referenceKeys.all,
    queryFn: () => apiFetch<ReferenceData>('/reference-data'),
    staleTime: 5 * 60_000,
  })
}
