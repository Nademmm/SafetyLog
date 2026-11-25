export const referenceKeys = {
  all: ['reference-data'] as const,
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (siteId?: string | number | null) =>
    siteId ? (['dashboard', String(siteId)] as const) : (['dashboard', 'all'] as const),
}

export const caseKeys = {
  all: ['cases'] as const,
  lists: () => ['cases', 'list'] as const,
  list: (params: Record<string, unknown>) => ['cases', 'list', params] as const,
  detail: (id: string | number) => ['cases', 'detail', String(id)] as const,
  similar: (id: string | number) => ['cases', 'similar', String(id)] as const,
  myCases: (params?: Record<string, unknown>) =>
    params ? (['my-cases', params] as const) : (['my-cases'] as const),
  byMachine: (machineId: string | number, params?: Record<string, unknown>) =>
    params
      ? (['machine-cases', String(machineId), params] as const)
      : (['machine-cases', String(machineId)] as const),
  openByMachine: (machineId: string | number) =>
    ['machine-open-cases', String(machineId)] as const,
}

export const actionKeys = {
  all: ['my-actions'] as const,
  myActions: (params?: Record<string, unknown>) =>
    params ? (['my-actions', params] as const) : (['my-actions'] as const),
}

export const machineKeys = {
  all: ['machines'] as const,
  list: (params?: Record<string, unknown>) =>
    params ? (['machines', 'list', params] as const) : (['machines', 'list'] as const),
  qr: (qrToken: string) => ['machines', 'qr', qrToken] as const,
}

export const siteKeys = {
  all: ['sites'] as const,
  list: (params?: Record<string, unknown>) =>
    params ? (['sites', 'list', params] as const) : (['sites', 'list'] as const),
}

export const areaKeys = {
  all: ['areas'] as const,
  list: (params?: Record<string, unknown>) =>
    params ? (['areas', 'list', params] as const) : (['areas', 'list'] as const),
}

export const userKeys = {
  all: ['users'] as const,
  list: (params?: Record<string, unknown>) =>
    params ? (['users', 'list', params] as const) : (['users', 'list'] as const),
}

export const notificationKeys = {
  all: ['notifications'] as const,
}

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params?: Record<string, unknown>) =>
    params ? (['audit-logs', params] as const) : (['audit-logs'] as const),
}

export const configKeys = {
  all: ['admin-config'] as const,
}
