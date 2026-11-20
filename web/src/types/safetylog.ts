export type UserRole = 'reporter' | 'supervisor' | 'hse' | 'admin'

export type RiskLevel = 'low' | 'medium' | 'high'

export type CaseStatus =
  | 'new'
  | 'assessed'
  | 'analyzed'
  | 'in_progress'
  | 'pending_verification'
  | 'closed'
  | 'rejected'
  | 'duplicate'

export type ActionType = 'temporary' | 'corrective' | 'preventive'
export type ActionStatus = 'open' | 'completed' | 'reopened'

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface OrganizationRef {
  id: number
  name: string
  code: string
  subscription_plan?: string
}

export interface SiteRef {
  id: number
  name: string
  code: string
  is_active?: boolean
}

export interface AreaPicRef {
  id: number
  name: string
  email?: string
  role?: UserRole
  role_label?: string
  job_title?: string | null
}

export interface AreaRef {
  id: number
  site_id?: number
  name: string
  code: string
  is_active?: boolean
  pic_user_id?: number | null
  pic_user?: AreaPicRef | null
  site?: SiteRef | null
}

export interface User {
  id: number
  organization_id: number
  site_id: number | null
  name: string
  email: string
  role: UserRole
  role_label: string
  job_title: string | null
  is_active: boolean
  permissions?: Record<string, boolean>
  organization?: OrganizationRef | null
  site?: SiteRef | null
}

export interface CaseType {
  id: number
  code: string
  name: string
  is_incident: boolean
  sort_order: number
}

export interface Category {
  id: number
  code: string
  name: string
  sort_order: number
}

export interface RiskConfig {
  id: number
  level: RiskLevel
  label: string
  min_score: number
  max_score: number
  first_response_hours: number
  temporary_action_hours: number
  permanent_action_hours: number
  requires_preventive_action: boolean
  color_hex: string
}

export interface EnumOption {
  value: string
  label: string
}

export interface ReferenceData {
  case_types: CaseType[]
  categories: Category[]
  risk_configs: RiskConfig[]
  configurations: Record<string, string | number | boolean | string[]>
  roles: EnumOption[]
  case_statuses: EnumOption[]
  action_types: EnumOption[]
  action_statuses: EnumOption[]
  risk_levels: EnumOption[]
}

export interface Machine {
  id: number
  organization_id?: number
  site_id?: number
  area_id?: number
  code: string
  name: string
  description?: string | null
  qr_token: string
  qr_url?: string
  is_active?: boolean
  archived_at?: string | null
  site?: SiteRef | null
  area?: AreaRef | null
  open_cases_count?: number
  is_recurring?: boolean
}

export interface Attachment {
  id: number
  file_name: string
  mime_type: string
  file_size: number
  url?: string
  created_at?: string
}

export interface CaseAction {
  id: number
  safety_case_id: number
  action_type: ActionType
  action_type_label: string
  title: string
  description: string | null
  status: ActionStatus
  status_label: string
  is_overdue: boolean
  overdue_label: string | null
  due_at: string
  completion_note: string | null
  completed_at: string | null
  can_complete: boolean
  pic: {
    id: number
    name: string
    email: string
    role: UserRole
    role_label: string
    job_title: string | null
  } | null
  creator?: { id: number; name: string; role: UserRole } | null
  completer?: { id: number; name: string } | null
  safety_case?: {
    id: number
    case_number: string
    status: CaseStatus
    status_label: string
    risk_level: RiskLevel | null
    risk_level_label: string | null
    machine: { id: number; code: string; name: string } | null
    root_cause?: {
      root_cause_category: string | null
      five_whys: string[] | null
      root_cause_summary: string | null
    } | null
  } | null
  attachments?: Attachment[]
  created_at?: string
}

export interface CaseStatusHistory {
  id: number
  safety_case_id?: number
  from_status: string | null
  from_status_label: string | null
  to_status: string
  to_status_label: string
  action_name: string
  reason: string | null
  changed_by?: { id: number; name: string; role?: UserRole; role_label?: string } | null
  safety_case?: {
    id: number
    case_number: string
    status?: CaseStatus
    status_label?: string
  } | null
  created_at: string
}

export interface SafetyCaseSummary {
  id: number
  case_number: string
  status: CaseStatus
  status_label: string
  risk_level: RiskLevel | null
  risk_level_label: string | null
  risk_score: number | null
  short_description: string
  is_machine_stopped: boolean
  has_affected_people: boolean
  reported_at: string
  case_type: { id: number; code: string; name: string } | null
  machine?: { id: number; code: string; name: string } | null
}

export interface SafetyCase {
  id: number
  organization_id: number
  case_number: string
  description: string
  is_machine_stopped: boolean
  has_affected_people: boolean
  status: CaseStatus
  status_label: string
  is_locked: boolean
  reported_at: string
  site: SiteRef | null
  area: AreaRef | null
  machine: { id: number; code: string; name: string; qr_token: string } | null
  reporter: {
    id: number
    name: string
    email: string
    role: UserRole
    role_label: string
    job_title: string | null
  } | null
  case_type: { id: number; code: string; name: string; is_incident: boolean } | null
  category: { id: number; code: string; name: string } | null
  risk_assessment: {
    severity: number | null
    likelihood: number | null
    risk_score: number | null
    risk_level: RiskLevel | null
    risk_level_label: string | null
    assigned_pic: { id: number; name: string; email: string; job_title: string | null } | null
    triaged_by: { id: number; name: string } | null
    triaged_at: string | null
    rejection_reason: string | null
    duplicate_of: { id: number; case_number: string; status: CaseStatus; status_label: string } | null
  }
  root_cause: {
    root_cause_category: string | null
    five_whys: string[] | null
    root_cause_summary: string | null
    analyzed_by: { id: number; name: string } | null
    analyzed_at: string | null
  }
  verification: {
    learning_summary: string | null
    verified_by: { id: number; name: string } | null
    verified_at: string | null
    closed_at: string | null
    reopened_by: { id: number; name: string } | null
    reopened_at: string | null
    reopen_reason: string | null
  }
  attachments?: Attachment[]
  actions?: CaseAction[]
  status_histories?: CaseStatusHistory[]
  available_actions?: {
    can_triage: boolean
    can_analyze_root_cause: boolean
    can_manage_actions: boolean
    can_verify: boolean
    can_reopen: boolean
    is_verifier_blocked_as_pic: boolean
  } | null
  created_at?: string
  updated_at?: string
}

export interface SimilarCaseItem {
  id: number
  case_number: string
  status: CaseStatus
  status_label: string
  description: string
  root_cause_category: string | null
  root_cause_summary: string | null
  learning_summary: string | null
  machine: { id: number; code: string; name: string } | null
  category: { id: number; name: string } | null
  reported_at: string | null
  similarity_percent: number
  matching_reasons: string[]
  method?: string
}

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
  safety_case_id?: number | null
  case_action_id?: number | null
}

export interface DashboardData {
  summary: {
    open_cases_count: number
    overdue_actions_count: number
    closed_this_month_count: number
    pending_verification_count: number
    high_risk_open_count: number
    total_cases_count: number
    recurring_machines_count: number
  }
  recurring_rule?: {
    threshold: number
    window_days: number
  }
  cases_per_machine: Array<{
    machine_id: number
    machine_code: string
    machine_name: string
    total_cases: number
    cases_last_90_days: number
    open_cases: number
    is_recurring: boolean
    recurring_label?: string | null
  }>
  cases_per_category: Array<{
    category_id: number | null
    category_name: string
    total_cases: number
  }>
  cases_by_risk_level: Array<{
    risk_level: string | null
    label: string
    total_cases: number
  }>
  cases_by_status: Array<{
    status: string
    label: string
    total_cases: number
  }>
  overdue_actions: Array<{
    id: number
    title: string
    action_type: ActionType
    action_type_label: string
    due_at: string
    days_overdue: number
    is_overdue: boolean
    overdue_label: string
    pic: { id: number; name: string; job_title: string | null } | null
    safety_case: {
      id: number
      case_number: string
      risk_level: RiskLevel | null
      risk_level_label: string | null
      machine: { id: number; code: string; name: string } | null
    } | null
  }>
}
