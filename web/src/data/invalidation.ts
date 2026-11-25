import type { QueryClient } from '@tanstack/react-query'
import {
  actionKeys,
  areaKeys,
  auditKeys,
  caseKeys,
  configKeys,
  dashboardKeys,
  machineKeys,
  notificationKeys,
  referenceKeys,
  siteKeys,
  userKeys,
} from '@/data/query-keys'

export function invalidateCaseMutation(
  queryClient: QueryClient,
  caseId?: string | number,
): Promise<void[]> {
  const invalidations: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: caseKeys.all }),
    queryClient.invalidateQueries({ queryKey: caseKeys.myCases() }),
    queryClient.invalidateQueries({ queryKey: actionKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    queryClient.invalidateQueries({ queryKey: auditKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['machine-cases'] }),
    queryClient.invalidateQueries({ queryKey: ['machine-open-cases'] }),
  ]

  if (caseId !== undefined) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) }),
      queryClient.invalidateQueries({ queryKey: caseKeys.similar(caseId) }),
    )
  }

  return Promise.all(invalidations)
}

export function invalidateActionMutation(
  queryClient: QueryClient,
  caseId?: string | number,
): Promise<void[]> {
  return invalidateCaseMutation(queryClient, caseId)
}

export function invalidateMasterDataMutation(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: machineKeys.all }),
    queryClient.invalidateQueries({ queryKey: areaKeys.all }),
    queryClient.invalidateQueries({ queryKey: siteKeys.all }),
    queryClient.invalidateQueries({ queryKey: userKeys.all }),
    queryClient.invalidateQueries({ queryKey: referenceKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  ])
}

export function invalidateConfigMutation(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: configKeys.all }),
    queryClient.invalidateQueries({ queryKey: referenceKeys.all }),
  ])
}

export function invalidateNotificationMutation(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  ])
}
