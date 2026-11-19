import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ReferenceData } from '@/types/safetylog'

export function useReferenceData() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: () => apiFetch<ReferenceData>('/reference-data'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}
