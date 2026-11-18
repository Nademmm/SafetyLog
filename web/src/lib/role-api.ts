import {
  API_BASE_URL,
  type AuthSession,
  type MachineRecord,
  type UserRoleCode,
} from '@/lib/qr-flow'

export interface PaginatedResponse<T> {
  data: T[]
  meta?: {
    current_page?: number
    last_page?: number
    total?: number
  }
}

export interface SimpleUserRef {
  id: number
  name: string
  email?: string
  role?: string
  role_label?: string
  job_title?: string | null
  is_active?: boolean
  site?: { id: number; name: string; code: string } | null
}

export interface AttachmentItem {
  id: number
  original_name: string
  mime_type: string
  file_size?: number
  url?: string
}

export interface CaseActionItem {
  id: number
  safety_case_id: number
  action_type: 'corrective' | 'preventive'
  action_type_label: string
  title: string
  description: string | null
  status: 'open' | 'completed'
  status_label: string
  is_overdue: boolean
  overdue_label?: string | null
  due_at: string | null
  completed_at: string | null
  completion_note: string | null
  can_complete?: boolean
  pic: SimpleUserRef | null
  creator?: SimpleUserRef | null
  completer?: SimpleUserRef | null
  attachments?: AttachmentItem[]
  safety_case?: {
    id: number
    case_number: string
    status: string
    status_label: string
    risk_level: string | null
    risk_level_label?: string | null
    machine?: { id: number; code: string; name: string } | null
  } | null
}

export interface StatusHistoryItem {
  id: number
  from_status: string | null
  from_status_label: string | null
  to_status: string
  to_status_label: string
  action_name?: string | null
  reason?: string | null
  metadata: Record<string, unknown> | null
  changed_by?: SimpleUserRef | null
  created_at: string | null
}

export interface SafetyCaseItem {
  id: number
  organization_id: number
  case_number: string
  status: string
  status_label: string
  description: string
  is_machine_stopped: boolean
  has_affected_people: boolean
  is_locked: boolean
  reported_at: string | null
  site: { id: number; name: string; code: string } | null
  area: {
    id: number
    name: string
    code: string
    pic_user?: SimpleUserRef | null
  } | null
  machine: { id: number; code: string; name: string; qr_token?: string | null } | null
  case_type: { id: number; code: string; name: string; is_incident: boolean } | null
  category: { id: number; code: string; name: string } | null
  reporter: SimpleUserRef | null
  risk_assessment?: {
    severity: number | null
    likelihood: number | null
    risk_score: number | null
    risk_level: 'low' | 'medium' | 'high' | null
    risk_level_label: string | null
    assigned_pic?: SimpleUserRef | null
    triaged_by?: SimpleUserRef | null
    triaged_at?: string | null
    rejection_reason?: string | null
  }
  root_cause?: {
    root_cause_category: string | null
    five_whys: string[] | null
    root_cause_summary: string | null
    analyzed_by?: SimpleUserRef | null
    analyzed_at?: string | null
  }
  verification?: {
    learning_summary: string | null
    verified_by?: SimpleUserRef | null
    verified_at?: string | null
    closed_at?: string | null
    reopened_by?: SimpleUserRef | null
    reopened_at?: string | null
    reopen_reason?: string | null
  }
  attachments?: AttachmentItem[]
  actions?: CaseActionItem[]
  status_histories?: StatusHistoryItem[]
  available_actions?: {
    can_triage: boolean
    can_analyze_root_cause: boolean
    can_manage_actions: boolean
    can_verify: boolean
    can_reopen: boolean
    is_verifier_blocked_as_pic: boolean
  } | null
}

export interface ReferenceDataPayload {
  case_types: Array<{ id: number; code: string; name: string; is_incident: boolean }>
  categories: Array<{ id: number; code: string; name: string }>
  risk_configs: Array<{
    id: number
    level: string
    label: string
    min_score: number
    max_score: number
    first_response_hours: number
    temporary_action_hours: number
    permanent_action_hours: number
    requires_preventive_action: boolean
    color_hex?: string | null
  }>
  configurations?: Record<string, unknown>
}

export interface SimilarCaseItem {
  id: number
  case_number: string
  status: string
  status_label: string
  risk_level?: string | null
  risk_level_label?: string | null
  description?: string
  short_description?: string
  description_excerpt?: string
  learning_summary?: string | null
  root_cause_summary?: string | null
  similarity_score?: number
}

export interface DashboardSummaryPayload {
  summary: {
    open_cases_count: number
    overdue_actions_count: number
    closed_this_month_count: number
    pending_verification_count: number
    high_risk_open_count: number
    total_cases_count: number
    recurring_machines_count: number
  }
  cases_per_machine: Array<{
    machine_id: number
    machine_code: string
    machine_name: string
    area_name: string | null
    total_cases: number
    open_cases: number
    cases_last_90_days: number
    is_recurring: boolean
    recurring_label?: string | null
  }>
  cases_by_status: Array<{ status: string; label: string; total_cases: number }>
  cases_by_risk_level: Array<{ risk_level: string | null; label: string; total_cases: number }>
  overdue_actions: Array<{
    id: number
    title: string
    action_type_label: string
    due_at: string
    days_overdue: number
    overdue_label: string
    pic?: SimpleUserRef | null
    safety_case?: {
      id: number
      case_number: string
      machine?: { id: number; code: string; name: string } | null
    } | null
  }>
  recurring_rule?: {
    threshold: number
    window_days: number
  }
}

export interface AuditLogItem {
  id: number
  from_status: string | null
  from_status_label?: string | null
  to_status: string
  to_status_label?: string | null
  action_name?: string | null
  reason?: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  changed_by?: SimpleUserRef | null
}

export interface NotificationItem {
  id: number
  type: string
  title: string
  message?: string
  body?: string
  read_at: string | null
  created_at: string
  safety_case_id?: number | null
  safety_case?: { id: number; case_number: string; status: string } | null
}

export interface SiteRecord {
  id: number
  code: string
  name: string
  address?: string | null
  is_active: boolean
}

export interface AreaRecord {
  id: number
  site_id: number
  code: string
  name: string
  is_active: boolean
  archived_at?: string | null
  site?: { id: number; code: string; name: string } | null
  pic_user_id?: number | null
  pic_user?: SimpleUserRef | null
}

async function apiRequest<T>(
  session: AuthSession,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (session.mode !== 'api') {
    throw new Error(
      'Sesi berjalan dalam mode demo offline. Nyalakan server API Laravel dan masuk kembali agar data tersimpan penuh.'
    )
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.token}`,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstFieldErrors =
      json?.errors && typeof json.errors === 'object'
        ? Object.values(json.errors).flat().filter(Boolean)[0]
        : null
    const message =
      (typeof firstFieldErrors === 'string' && firstFieldErrors) ||
      (typeof json?.message === 'string' && json.message) ||
      `Permintaan gagal (HTTP ${response.status}).`
    throw new Error(message)
  }

  return json as T
}

export function fetchMyCases(
  session: AuthSession,
  params: { q?: string; status?: string; perPage?: number } = {}
): Promise<PaginatedResponse<SafetyCaseItem>> {
  const query = new URLSearchParams()
  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.status) query.set('status', params.status)
  query.set('per_page', String(params.perPage ?? 20))
  return apiRequest(session, `/my-cases?${query.toString()}`)
}

export function fetchAllCases(
  session: AuthSession,
  params: { q?: string; status?: string; risk_level?: string; perPage?: number } = {}
): Promise<PaginatedResponse<SafetyCaseItem>> {
  const query = new URLSearchParams()
  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.status) query.set('status', params.status)
  if (params.risk_level) query.set('risk_level', params.risk_level)
  query.set('per_page', String(params.perPage ?? 30))
  return apiRequest(session, `/cases?${query.toString()}`)
}

export async function fetchCaseDetail(
  session: AuthSession,
  caseId: number
): Promise<SafetyCaseItem> {
  const res = await apiRequest<{ data: SafetyCaseItem }>(session, `/cases/${caseId}`)
  return res.data
}

export async function fetchSimilarCases(
  session: AuthSession,
  caseId: number
): Promise<SimilarCaseItem[]> {
  const res = await apiRequest<{ data: SimilarCaseItem[] }>(
    session,
    `/cases/${caseId}/similar`
  )
  return res.data ?? []
}

export async function fetchAssignableUsers(
  session: AuthSession
): Promise<SimpleUserRef[]> {
  const res = await apiRequest<{ data: SimpleUserRef[] }>(session, '/users/assignable')
  return res.data ?? []
}

export async function fetchReferenceData(
  session: AuthSession
): Promise<ReferenceDataPayload> {
  return apiRequest<ReferenceDataPayload>(session, '/reference-data')
}

export function submitCaseTriage(
  session: AuthSession,
  caseId: number,
  payload: {
    decision: 'assess' | 'reject' | 'duplicate'
    severity?: number
    likelihood?: number
    category_id?: number | null
    assigned_pic_id?: number | null
    rejection_reason?: string
    duplicate_of_case_id?: number | null
  }
): Promise<{ message: string; data: SafetyCaseItem }> {
  return apiRequest(session, `/cases/${caseId}/triage`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitRootCause(
  session: AuthSession,
  caseId: number,
  payload: {
    root_cause_category: string
    five_whys: string[]
    root_cause_summary: string
  }
): Promise<{ message: string; data: SafetyCaseItem }> {
  return apiRequest(session, `/cases/${caseId}/root-cause`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createCaseAction(
  session: AuthSession,
  caseId: number,
  payload: {
    action_type: 'corrective' | 'preventive'
    title: string
    description?: string
    pic_user_id: number
    due_at?: string
  }
): Promise<{ message: string; data: CaseActionItem }> {
  return apiRequest(session, `/cases/${caseId}/actions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifyCase(
  session: AuthSession,
  caseId: number,
  payload: {
    decision: 'approve' | 'reject'
    learning_summary?: string
    rejection_reason?: string
  }
): Promise<{ message: string; data: SafetyCaseItem }> {
  return apiRequest(session, `/cases/${caseId}/verify`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reopenCase(
  session: AuthSession,
  caseId: number,
  reason: string
): Promise<{ message: string; data: SafetyCaseItem }> {
  return apiRequest(session, `/cases/${caseId}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function fetchMyActions(
  session: AuthSession,
  status: 'open' | 'completed' | 'all' = 'open'
): Promise<CaseActionItem[]> {
  const res = await apiRequest<{ data: CaseActionItem[] }>(
    session,
    `/my-actions?status=${status}`
  )
  return res.data ?? []
}

export function completeCaseAction(
  session: AuthSession,
  actionId: number,
  completionNote: string,
  photos: File[] = []
): Promise<{ message: string; data: CaseActionItem }> {
  const formData = new FormData()
  formData.append('completion_note', completionNote)
  for (const file of photos) {
    formData.append('photos[]', file)
  }
  return apiRequest(session, `/actions/${actionId}/complete`, {
    method: 'POST',
    body: formData,
  })
}

export async function fetchDashboardSummary(
  session: AuthSession
): Promise<DashboardSummaryPayload> {
  const res = await apiRequest<{ data: DashboardSummaryPayload }>(session, '/dashboard')
  return res.data
}

export function fetchAuditLogs(
  session: AuthSession
): Promise<PaginatedResponse<AuditLogItem>> {
  return apiRequest(session, '/audit-logs?per_page=30')
}

export async function fetchNotifications(
  session: AuthSession
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const res = await apiRequest<{
    data: NotificationItem[]
    unread_count?: number
  }>(session, '/notifications')
  return {
    notifications: res.data ?? [],
    unreadCount: Number(res.unread_count ?? 0),
  }
}

export function markNotificationRead(
  session: AuthSession,
  id: number
): Promise<unknown> {
  return apiRequest(session, `/notifications/${id}/read`, { method: 'POST' })
}

export function markAllNotificationsRead(session: AuthSession): Promise<unknown> {
  return apiRequest(session, '/notifications/read-all', { method: 'POST' })
}

export async function fetchSites(session: AuthSession): Promise<SiteRecord[]> {
  const res = await apiRequest<{ data: SiteRecord[] }>(session, '/sites')
  return res.data ?? []
}

export function createSite(
  session: AuthSession,
  payload: { name: string; address?: string }
): Promise<{ message: string; data: SiteRecord }> {
  return apiRequest(session, '/sites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function toggleArchiveSite(
  session: AuthSession,
  siteId: number,
  archived: boolean
): Promise<unknown> {
  return apiRequest(session, `/sites/${siteId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archived }),
  })
}

export async function fetchAreas(session: AuthSession): Promise<AreaRecord[]> {
  const res = await apiRequest<{ data: AreaRecord[] }>(
    session,
    '/areas?include_archived=1'
  )
  return res.data ?? []
}

export function createArea(
  session: AuthSession,
  payload: { site_id: number; name: string; pic_user_id?: number | null }
): Promise<{ message: string; data: AreaRecord }> {
  return apiRequest(session, '/areas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function toggleArchiveArea(
  session: AuthSession,
  areaId: number,
  archived: boolean
): Promise<unknown> {
  return apiRequest(session, `/areas/${areaId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archived }),
  })
}

export function createMachine(
  session: AuthSession,
  payload: {
    area_id: number
    name: string
    description?: string
  }
): Promise<{ message: string; data: MachineRecord }> {
  return apiRequest(session, '/machines', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function toggleArchiveMachine(
  session: AuthSession,
  machineId: number,
  archived: boolean
): Promise<unknown> {
  return apiRequest(session, `/machines/${machineId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archived }),
  })
}

export function regenerateMachineQr(
  session: AuthSession,
  machineId: number
): Promise<{ message: string; data: MachineRecord }> {
  return apiRequest(session, `/machines/${machineId}/regenerate-qr`, {
    method: 'POST',
  })
}

export async function fetchUsers(session: AuthSession): Promise<SimpleUserRef[]> {
  const res = await apiRequest<{ data: SimpleUserRef[] }>(session, '/users')
  return res.data ?? []
}

export function createUser(
  session: AuthSession,
  payload: {
    name: string
    email: string
    password: string
    role: UserRoleCode
    job_title?: string
    site_id?: number | null
  }
): Promise<{ message: string; data: SimpleUserRef }> {
  return apiRequest(session, '/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(
  session: AuthSession,
  userId: number,
  payload: {
    role?: UserRoleCode
    is_active?: boolean
    job_title?: string
    site_id?: number | null
  }
): Promise<{ message: string; data: SimpleUserRef }> {
  return apiRequest(session, `/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateRiskConfig(
  session: AuthSession,
  riskConfigId: number,
  payload: {
    requires_preventive_action: boolean
  }
): Promise<unknown> {
  return apiRequest(session, `/risk-configs/${riskConfigId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
