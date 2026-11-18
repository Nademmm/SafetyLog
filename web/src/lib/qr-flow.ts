/**
 * B-07 QR per Mesin, Halaman Cetak, dan Alur Scan QR (Login B-05 -> Form Lapor B-08)
 * Mendukung integrasi langsung ke REST API Laravel (`http://localhost:8000/api`)
 * dengan fallback data seeder resmi (`DatabaseSeeder` / `DemoSeeder`) untuk pengujian mandiri.
 */

export interface SiteInfo {
  id: number
  name: string
  code: string
}

export interface AreaPicUserInfo {
  id: number
  name: string
  email?: string
  role?: string
  job_title?: string | null
}

export interface AreaInfo {
  id: number
  name: string
  code: string
  pic_user?: AreaPicUserInfo | null
}

export interface MachineRecord {
  id: number
  organization_id: number
  code: string
  name: string
  qr_token: string | null
  qr_report_path: string | null
  description: string | null
  is_active: boolean
  archived_at: string | null
  site: SiteInfo
  area: AreaInfo
}

export interface CaseTypeRecord {
  id: number
  code: string
  name: string
  is_incident: boolean
}

export interface OpenCaseSummary {
  id: number
  case_number: string
  status: string
  status_label: string
  risk_level: string | null
  risk_label: string | null
  risk_score: number | null
  description_excerpt: string
  reported_at: string
  case_type?: {
    id: number
    code: string
    name: string
  }
}

export interface OpenCasesWarning {
  has_open_cases: boolean
  count: number
  window_days: number
  cases: OpenCaseSummary[]
}

export interface QrLookupResult {
  machine: MachineRecord
  case_types: CaseTypeRecord[]
  open_cases_warning: OpenCasesWarning
  source: 'api' | 'demo'
}

export type UserRoleCode = 'reporter' | 'supervisor' | 'hse' | 'admin'

export interface RolePermissions {
  report_case: boolean
  scan_qr: boolean
  view_own_cases: boolean
  complete_assigned_actions: boolean
  view_all_cases: boolean
  triage_case: boolean
  manage_actions: boolean
  verify_case: boolean
  reopen_case: boolean
  view_dashboard: boolean
  view_audit_logs: boolean
  print_machine_qr: boolean
  manage_master_data: boolean
}

export type AppTab =
  | 'dashboard'
  | 'report'
  | 'my-cases'
  | 'my-actions'
  | 'cases'
  | 'audit-logs'
  | 'qr-print'
  | 'admin'
  | 'notifications'
  | 'tokens'
  | 'login'

export interface AuthUser {
  id: number
  organization_id: number
  name: string
  email: string
  role: UserRoleCode
  role_label: string
  job_title: string
  organization_name: string
  site_name: string
  permissions?: RolePermissions
}

export function getDefaultPermissionsForRole(role: UserRoleCode): RolePermissions {
  const isSupervisor = role === 'supervisor'
  const isHse = role === 'hse'
  const isAdmin = role === 'admin'
  const canSeeOperations = isSupervisor || isHse || isAdmin

  return {
    report_case: true,
    scan_qr: true,
    view_own_cases: true,
    complete_assigned_actions: true,
    view_all_cases: canSeeOperations,
    triage_case: isSupervisor || isAdmin,
    manage_actions: canSeeOperations,
    verify_case: isHse || isAdmin,
    reopen_case: isHse || isAdmin,
    view_dashboard: canSeeOperations,
    view_audit_logs: canSeeOperations,
    print_machine_qr: isAdmin,
    manage_master_data: isAdmin,
  }
}

export function getUserPermissions(user: AuthUser | null | undefined): RolePermissions {
  if (!user) {
    return getDefaultPermissionsForRole('reporter')
  }
  return {
    ...getDefaultPermissionsForRole(user.role),
    ...(user.permissions ?? {}),
  }
}

export function getDefaultTabForRole(role: UserRoleCode): AppTab {
  if (role === 'reporter') {
    return 'report'
  }
  return 'dashboard'
}

export function canAccessTab(session: AuthSession | null, tab: AppTab): boolean {
  if (tab === 'login') return true
  if (!session) return false

  const perms = getUserPermissions(session.user)
  switch (tab) {
    case 'report':
      return perms.report_case
    case 'my-cases':
      return perms.view_own_cases
    case 'my-actions':
      return perms.complete_assigned_actions
    case 'notifications':
      return true
    case 'dashboard':
      return perms.view_dashboard
    case 'cases':
      return perms.view_all_cases
    case 'audit-logs':
      return perms.view_audit_logs
    case 'qr-print':
      return perms.print_machine_qr
    case 'admin':
    case 'tokens':
      return perms.manage_master_data
    default:
      return false
  }
}

export function getAllowedRolesLabelForTab(tab: AppTab): string {
  switch (tab) {
    case 'dashboard':
    case 'cases':
    case 'audit-logs':
      return 'Supervisor, K3 / Verifikator, Manajer / Admin'
    case 'qr-print':
    case 'admin':
    case 'tokens':
      return 'Manajer / Admin'
    case 'report':
    case 'my-cases':
    case 'my-actions':
    case 'notifications':
      return 'Seluruh peran yang sudah masuk'
    default:
      return 'Terbuka'
  }
}

export function getPathForTab(tab: AppTab, qrToken?: string | null): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard'
    case 'report':
      return qrToken ? buildQrReportPath(qrToken) : '/report'
    case 'my-cases':
      return '/my-cases'
    case 'my-actions':
      return '/my-actions'
    case 'cases':
      return '/cases'
    case 'audit-logs':
      return '/audit-logs'
    case 'qr-print':
      return '/machines/qr'
    case 'admin':
      return '/admin'
    case 'notifications':
      return '/notifications'
    case 'tokens':
      return '/design-tokens'
    case 'login':
      return '/login'
  }
}

export interface AuthSession {
  token: string
  user: AuthUser
  mode: 'api' | 'demo'
}

export interface PendingQrRedirect {
  qrToken: string
  redirectPath: string
  savedAt: string
}

const AUTH_STORAGE_KEY = 'safetylog_auth_session_v1'
const PENDING_QR_STORAGE_KEY = 'safetylog_pending_qr_redirect_v1'

export const API_BASE_URL = 'http://localhost:8000/api'

export const DEMO_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 1,
    organization_id: 1,
    name: 'Budi Santoso',
    email: 'pelapor@safetylog.test',
    password: 'password123',
    role: 'reporter',
    role_label: 'Pelapor',
    job_title: 'Operator Lini Pengemasan',
    organization_name: 'PT Pangan Nusantara Sejahtera',
    site_name: 'Pabrik Sidoarjo 1',
  },
  {
    id: 2,
    organization_id: 1,
    name: 'Rina Wijaya',
    email: 'supervisor@safetylog.test',
    password: 'password123',
    role: 'supervisor',
    role_label: 'Supervisor',
    job_title: 'Supervisor Produksi',
    organization_name: 'PT Pangan Nusantara Sejahtera',
    site_name: 'Pabrik Sidoarjo 1',
  },
  {
    id: 3,
    organization_id: 1,
    name: 'Andi Pratama',
    email: 'k3@safetylog.test',
    password: 'password123',
    role: 'hse',
    role_label: 'K3 / Verifikator',
    job_title: 'Petugas K3 / HSE',
    organization_name: 'PT Pangan Nusantara Sejahtera',
    site_name: 'Pabrik Sidoarjo 1',
  },
  {
    id: 4,
    organization_id: 1,
    name: 'Dewi Lestari',
    email: 'admin@safetylog.test',
    password: 'password123',
    role: 'admin',
    role_label: 'Manajer / Admin',
    job_title: 'Manajer Operasional',
    organization_name: 'PT Pangan Nusantara Sejahtera',
    site_name: 'Pabrik Sidoarjo 1',
  },
]

export const DEFAULT_CASE_TYPES: CaseTypeRecord[] = [
  { id: 1, code: 'machine_abnormality', name: 'Abnormalitas mesin', is_incident: false },
  { id: 2, code: 'breakdown', name: 'Kerusakan', is_incident: false },
  { id: 3, code: 'unsafe_condition', name: 'Kondisi tidak aman', is_incident: false },
  { id: 4, code: 'near_miss', name: 'Nyaris celaka (near miss)', is_incident: false },
  { id: 5, code: 'incident', name: 'Insiden', is_incident: true },
]

const SITE_SBY1: SiteInfo = {
  id: 1,
  name: 'Pabrik Sidoarjo 1',
  code: 'SBY1',
}

const AREA_PACK_A: AreaInfo = {
  id: 1,
  name: 'Lini Pengemasan A',
  code: 'PACK-A',
  pic_user: {
    id: 2,
    name: 'Rina Wijaya',
    email: 'supervisor@safetylog.test',
    role: 'supervisor',
    job_title: 'Supervisor Produksi',
  },
}

const AREA_FILL_1: AreaInfo = {
  id: 2,
  name: 'Lini Filling & Mixing',
  code: 'FILL-1',
  pic_user: {
    id: 2,
    name: 'Rina Wijaya',
    email: 'supervisor@safetylog.test',
    role: 'supervisor',
    job_title: 'Supervisor Produksi',
  },
}

const AREA_UTIL_1: AreaInfo = {
  id: 3,
  name: 'Utilitas & Boiler',
  code: 'UTIL-1',
  pic_user: {
    id: 2,
    name: 'Rina Wijaya',
    email: 'supervisor@safetylog.test',
    role: 'supervisor',
    job_title: 'Supervisor Produksi',
  },
}

const AREA_WH_FG: AreaInfo = {
  id: 4,
  name: 'Gudang Bahan & Jadi',
  code: 'WH-FG',
  pic_user: {
    id: 2,
    name: 'Rina Wijaya',
    email: 'supervisor@safetylog.test',
    role: 'supervisor',
    job_title: 'Supervisor Produksi',
  },
}

export const SEEDED_MACHINES: MachineRecord[] = [
  {
    id: 1,
    organization_id: 1,
    code: 'MCH-CONV-01',
    name: 'Mesin Konveyor Pengemasan 01',
    qr_token: 'qr-pns-sby1-conv-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-conv-01-demo',
    description: 'Konveyor utama pengemasan karton otomatis lini A.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_PACK_A,
  },
  {
    id: 2,
    organization_id: 1,
    code: 'MCH-FILL-01',
    name: 'Mesin Rotary Filler 01',
    qr_token: 'qr-pns-sby1-fill-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-fill-01-demo',
    description: 'Mesin pengisian botol berkecepatan tinggi.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_FILL_1,
  },
  {
    id: 3,
    organization_id: 1,
    code: 'MCH-COMP-01',
    name: 'Kompresor Udara Sentral 01',
    qr_token: 'qr-pns-sby1-comp-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-comp-01-demo',
    description: 'Kompresor pneumatik penyuplai tekanan lini produksi.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_UTIL_1,
  },
  {
    id: 4,
    organization_id: 1,
    code: 'MCH-SEAL-01',
    name: 'Mesin Carton Sealer 01',
    qr_token: 'qr-pns-sby1-seal-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-seal-01-demo',
    description: 'Mesin perekat karton otomatis jalur A.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_PACK_A,
  },
  {
    id: 5,
    organization_id: 1,
    code: 'MCH-LABL-01',
    name: 'Mesin Labeling Botol 01',
    qr_token: 'qr-pns-sby1-labl-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-labl-01-demo',
    description: 'Mesin penempel label stiker produk.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_PACK_A,
  },
  {
    id: 6,
    organization_id: 1,
    code: 'MCH-MIXR-01',
    name: 'Tangki Mixing Stainless 01',
    qr_token: 'qr-pns-sby1-mixr-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-mixr-01-demo',
    description: 'Tangki pencampur adonan cair kapasitas 1000L.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_FILL_1,
  },
  {
    id: 7,
    organization_id: 1,
    code: 'MCH-PAST-01',
    name: 'Unit Pasteurisasi Plate 01',
    qr_token: 'qr-pns-sby1-past-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-past-01-demo',
    description: 'Penukar panas suhu tinggi lini filling.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_FILL_1,
  },
  {
    id: 8,
    organization_id: 1,
    code: 'MCH-BOIL-01',
    name: 'Boiler Uap Utama 01',
    qr_token: 'qr-pns-sby1-boil-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-boil-01-demo',
    description: 'Boiler penyuplai uap untuk pasteurisasi.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_UTIL_1,
  },
  {
    id: 9,
    organization_id: 1,
    code: 'MCH-CHIL-01',
    name: 'Water Chiller Sentral 01',
    qr_token: 'qr-pns-sby1-chil-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-chil-01-demo',
    description: 'Unit pendingin sirkulasi proses produksi.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_UTIL_1,
  },
  {
    id: 10,
    organization_id: 1,
    code: 'MCH-PALW-01',
    name: 'Mesin Pallet Wrapper 01',
    qr_token: 'qr-pns-sby1-palw-01-demo',
    qr_report_path: '/report?qr=qr-pns-sby1-palw-01-demo',
    description: 'Pembungkus palet stretch film area gudang.',
    is_active: true,
    archived_at: null,
    site: SITE_SBY1,
    area: AREA_WH_FG,
  },
]

const DEMO_OPEN_CASES_BY_CODE: Record<string, OpenCaseSummary[]> = {
  'MCH-CONV-01': [
    {
      id: 4,
      case_number: 'SL-SBY1-2026-0004',
      status: 'new',
      status_label: 'Baru',
      risk_level: null,
      risk_label: null,
      risk_score: null,
      description_excerpt:
        'Pelindung samping konveyor pengemasan bagian ujung bergetar dan bautnya kendur.',
      reported_at: '2 hari lalu',
      case_type: {
        id: 3,
        code: 'unsafe_condition',
        name: 'Kondisi tidak aman',
      },
    },
  ],
  'MCH-FILL-01': [
    {
      id: 7,
      case_number: 'SL-SBY1-2026-0007',
      status: 'pending_verification',
      status_label: 'Menunggu verifikasi',
      risk_level: 'low',
      risk_label: 'Rendah',
      risk_score: 6,
      description_excerpt:
        'Genangan air bilasan di sekitar lantai operator mesin filler.',
      reported_at: '4 hari lalu',
      case_type: {
        id: 3,
        code: 'unsafe_condition',
        name: 'Kondisi tidak aman',
      },
    },
  ],
}

export function buildQrReportPath(qrToken: string): string {
  return `/report?qr=${encodeURIComponent(qrToken.trim())}`
}

export function buildQrReportUrl(qrToken: string, origin?: string): string {
  const baseOrigin =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
  return `${baseOrigin}${buildQrReportPath(qrToken)}`
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'reporter':
      return 'Pelapor'
    case 'supervisor':
      return 'Supervisor'
    case 'hse':
      return 'K3 / Verifikator'
    case 'admin':
      return 'Manajer / Admin'
    default:
      return role
  }
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.token || !parsed?.user?.email) return null
    return {
      ...parsed,
      user: {
        ...parsed.user,
        permissions: getUserPermissions(parsed.user),
      },
    }
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function savePendingQrRedirect(qrToken: string, redirectPath?: string): PendingQrRedirect {
  const cleanToken = qrToken.trim()
  const payload: PendingQrRedirect = {
    qrToken: cleanToken,
    redirectPath: redirectPath ?? buildQrReportPath(cleanToken),
    savedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PENDING_QR_STORAGE_KEY, JSON.stringify(payload))
  }
  return payload
}

export function getPendingQrRedirect(): PendingQrRedirect | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_QR_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingQrRedirect
    if (!parsed?.qrToken) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingQrRedirect(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_QR_STORAGE_KEY)
}

export function extractQrTokenFromRedirectParam(redirectParam: string | null): string | null {
  if (!redirectParam) return null
  try {
    const url = new URL(redirectParam, 'http://localhost')
    const qr = url.searchParams.get('qr')
    return qr ? qr.trim() : null
  } catch {
    return null
  }
}

export async function loginWithApiOrDemo(
  email: string,
  password: string
): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase()

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        device_name: 'safetylog-web-pwa',
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errMessage =
        typeof body?.message === 'string'
          ? body.message
          : 'Email atau kata sandi tidak sesuai.'
      throw new Error(errMessage)
    }

    const apiUser = body.user ?? body.data?.user
    const apiToken = body.token ?? body.access_token ?? body.data?.token

    if (apiToken && apiUser) {
      const roleCode = (apiUser.role ?? 'reporter') as UserRoleCode
      const session: AuthSession = {
        token: String(apiToken),
        mode: 'api',
        user: {
          id: Number(apiUser.id ?? 1),
          organization_id: Number(
            apiUser.organization_id ?? apiUser.organization?.id ?? 1
          ),
          name: String(apiUser.name ?? normalizedEmail),
          email: String(apiUser.email ?? normalizedEmail),
          role: roleCode,
          role_label: String(apiUser.role_label ?? getRoleLabel(roleCode)),
          job_title: String(apiUser.job_title ?? 'Personel Pabrik'),
          organization_name: String(
            apiUser.organization?.name ?? 'PT Pangan Nusantara Sejahtera'
          ),
          site_name: String(apiUser.site?.name ?? 'Pabrik Sidoarjo 1'),
          permissions: {
            ...getDefaultPermissionsForRole(roleCode),
            ...(apiUser.permissions && typeof apiUser.permissions === 'object'
              ? (apiUser.permissions as Partial<RolePermissions>)
              : {}),
          },
        },
      }
      saveAuthSession(session)
      return session
    }
  } catch (err) {
    // Jika error berasal dari respons HTTP validasi API (bukan jaringan mati), teruskan pesan errornya
    if (err instanceof Error && !(err instanceof TypeError)) {
      throw err
    }
  }

  // Fallback lokal untuk akun seeder resmi ketika server backend belum dinyalakan
  const demoMatch = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  )

  if (!demoMatch) {
    throw new Error('Email atau password salah. Gunakan akun demo (password: password123).')
  }

  const session: AuthSession = {
    token: `demo-sanctum-token-${demoMatch.role}-${demoMatch.id}`,
    mode: 'demo',
    user: {
      id: demoMatch.id,
      organization_id: demoMatch.organization_id,
      name: demoMatch.name,
      email: demoMatch.email,
      role: demoMatch.role,
      role_label: demoMatch.role_label,
      job_title: demoMatch.job_title,
      organization_name: demoMatch.organization_name,
      site_name: demoMatch.site_name,
      permissions: getDefaultPermissionsForRole(demoMatch.role),
    },
  }

  saveAuthSession(session)
  return session
}

export async function fetchMachinesList(
  session: AuthSession | null
): Promise<{ machines: MachineRecord[]; source: 'api' | 'demo' }> {
  if (session?.token && session.mode === 'api') {
    try {
      const includeArchivedQuery = getUserPermissions(session.user).manage_master_data
        ? '?include_archived=1'
        : ''
      const response = await fetch(`${API_BASE_URL}/machines${includeArchivedQuery}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
      })
      if (response.ok) {
        const json = await response.json()
        const rawList = Array.isArray(json?.data) ? json.data : []
        if (rawList.length > 0) {
          const mapped: MachineRecord[] = rawList.map((m: Record<string, unknown>) => ({
            id: Number(m.id),
            organization_id: session.user.organization_id,
            code: String(m.code),
            name: String(m.name),
            qr_token: m.qr_token ? String(m.qr_token) : null,
            qr_report_path: m.qr_report_path
              ? String(m.qr_report_path)
              : m.qr_token
                ? buildQrReportPath(String(m.qr_token))
                : null,
            description: m.description ? String(m.description) : null,
            is_active: Boolean(m.is_active ?? true),
            archived_at: m.archived_at ? String(m.archived_at) : null,
            site: (m.site as SiteInfo) ?? SITE_SBY1,
            area: (m.area as AreaInfo) ?? AREA_PACK_A,
          }))
          return { machines: mapped, source: 'api' }
        }
      }
    } catch {
      // Fallback ke data seeder jika API tidak terjangkau
    }
  }

  return { machines: SEEDED_MACHINES, source: 'demo' }
}

export async function lookupMachineByQrToken(
  qrToken: string,
  session: AuthSession | null,
  localMachines: MachineRecord[] = SEEDED_MACHINES
): Promise<QrLookupResult> {
  const trimmedToken = qrToken.trim()

  if (!trimmedToken) {
    throw new Error('Token QR mesin kosong atau tidak valid.')
  }

  // Tolak jika parameter yang dikirim adalah nomor urut (ID numerik murni), sesuai aturan B-07
  if (/^\d+$/.test(trimmedToken)) {
    throw new Error(
      'Kode QR tidak valid: sistem hanya menerima token QR acak, bukan ID nomor urut mesin.'
    )
  }

  if (session?.token && session.mode === 'api') {
    try {
      const response = await fetch(
        `${API_BASE_URL}/machines/qr/${encodeURIComponent(trimmedToken)}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
        }
      )

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          typeof json?.message === 'string'
            ? json.message
            : response.status === 403
              ? 'Anda tidak memiliki akses ke mesin organisasi lain.'
              : 'Kode QR mesin tidak ditemukan.'
        throw new Error(message)
      }

      const rawMachine = (json.machine ?? json.data) as Record<string, unknown>
      const machine: MachineRecord = {
        id: Number(rawMachine.id),
        organization_id: session.user.organization_id,
        code: String(rawMachine.code),
        name: String(rawMachine.name),
        qr_token: String(rawMachine.qr_token),
        qr_report_path: String(
          rawMachine.qr_report_path ?? buildQrReportPath(String(rawMachine.qr_token))
        ),
        description: rawMachine.description ? String(rawMachine.description) : null,
        is_active: Boolean(rawMachine.is_active ?? true),
        archived_at: rawMachine.archived_at ? String(rawMachine.archived_at) : null,
        site: (rawMachine.site as SiteInfo) ?? SITE_SBY1,
        area: (rawMachine.area as AreaInfo) ?? AREA_PACK_A,
      }

      const caseTypes: CaseTypeRecord[] =
        Array.isArray(json.case_types) && json.case_types.length > 0
          ? json.case_types
          : DEFAULT_CASE_TYPES

      const warning: OpenCasesWarning = json.open_cases_warning ?? {
        has_open_cases: false,
        count: 0,
        window_days: 7,
        cases: [],
      }

      return {
        machine,
        case_types: caseTypes,
        open_cases_warning: warning,
        source: 'api',
      }
    } catch (err) {
      if (err instanceof Error && !(err instanceof TypeError)) {
        throw err
      }
    }
  }

  // Fallback lookup berdasarkan qr_token acak & isolasi organization_id
  const machine = localMachines.find((m) => m.qr_token === trimmedToken)

  if (!machine) {
    throw new Error('Kode QR mesin tidak ditemukan.')
  }

  if (session && machine.organization_id !== session.user.organization_id) {
    throw new Error('Anda tidak memiliki akses ke mesin organisasi lain.')
  }

  if (!machine.is_active || machine.archived_at !== null) {
    throw new Error('Mesin ini sudah diarsipkan dan tidak dapat dipilih.')
  }

  const openCases = DEMO_OPEN_CASES_BY_CODE[machine.code] ?? []

  return {
    machine,
    case_types: DEFAULT_CASE_TYPES,
    open_cases_warning: {
      has_open_cases: openCases.length > 0,
      count: openCases.length,
      window_days: 7,
      cases: openCases,
    },
    source: 'demo',
  }
}

export async function lookupReportFormMachine(
  params: { qrToken?: string | null; machineId?: number | null },
  session: AuthSession | null,
  localMachines: MachineRecord[] = SEEDED_MACHINES
): Promise<QrLookupResult> {
  const cleanQr = params.qrToken?.trim() || null
  const machineId = params.machineId ?? null

  if (cleanQr) {
    return lookupMachineByQrToken(cleanQr, session, localMachines)
  }

  if (!machineId) {
    throw new Error('Pilih mesin atau scan kode QR mesin terlebih dahulu.')
  }

  if (session?.token && session.mode === 'api') {
    try {
      const response = await fetch(
        `${API_BASE_URL}/report-form?machine_id=${encodeURIComponent(String(machineId))}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
        }
      )

      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          typeof json?.message === 'string'
            ? json.message
            : 'Gagal memuat data mesin untuk pelaporan.'
        throw new Error(message)
      }

      const rawMachine = json.selected_machine as Record<string, unknown> | null
      if (!rawMachine) {
        throw new Error('Mesin tidak ditemukan atau sudah diarsipkan.')
      }

      const machine: MachineRecord = {
        id: Number(rawMachine.id),
        organization_id: session.user.organization_id,
        code: String(rawMachine.code),
        name: String(rawMachine.name),
        qr_token: rawMachine.qr_token ? String(rawMachine.qr_token) : null,
        qr_report_path: rawMachine.qr_report_path
          ? String(rawMachine.qr_report_path)
          : rawMachine.qr_token
            ? buildQrReportPath(String(rawMachine.qr_token))
            : null,
        description: rawMachine.description ? String(rawMachine.description) : null,
        is_active: Boolean(rawMachine.is_active ?? true),
        archived_at: rawMachine.archived_at ? String(rawMachine.archived_at) : null,
        site: (rawMachine.site as SiteInfo) ?? SITE_SBY1,
        area: (rawMachine.area as AreaInfo) ?? AREA_PACK_A,
      }

      const caseTypes: CaseTypeRecord[] =
        Array.isArray(json.case_types) && json.case_types.length > 0
          ? json.case_types
          : DEFAULT_CASE_TYPES

      const warning: OpenCasesWarning = json.open_cases_warning ?? {
        has_open_cases: false,
        count: 0,
        window_days: 7,
        cases: [],
      }

      return {
        machine,
        case_types: caseTypes,
        open_cases_warning: warning,
        source: 'api',
      }
    } catch (err) {
      if (err instanceof Error && !(err instanceof TypeError)) {
        throw err
      }
    }
  }

  const machine = localMachines.find((m) => m.id === machineId)
  if (!machine) {
    throw new Error('Mesin tidak ditemukan.')
  }
  const openCases = DEMO_OPEN_CASES_BY_CODE[machine.code] ?? []
  return {
    machine,
    case_types: DEFAULT_CASE_TYPES,
    open_cases_warning: {
      has_open_cases: openCases.length > 0,
      count: openCases.length,
      window_days: 7,
      cases: openCases,
    },
    source: 'demo',
  }
}

export interface SubmitCaseReportPayload {
  machine: MachineRecord
  caseTypeId: number
  caseTypeName: string
  description: string
  isMachineStopped: boolean
  hasAffectedPeople: boolean
  qrToken?: string | null
  photos?: File[]
  reportDurationSeconds?: number
  showEmergencyFallback: boolean
}

export interface SubmitCaseReportResult {
  caseNumber: string
  machineCode: string
  machineName: string
  caseTypeName: string
  emergencyReminder: string | null
}

export async function submitCaseReport(
  session: AuthSession,
  payload: SubmitCaseReportPayload
): Promise<SubmitCaseReportResult> {
  const { machine } = payload

  if (session.mode === 'api') {
    const formData = new FormData()
    formData.append('machine_id', String(machine.id))
    if (payload.qrToken) {
      formData.append('qr_token', payload.qrToken)
    }
    formData.append('case_type_id', String(payload.caseTypeId))
    formData.append('description', payload.description)
    formData.append('is_machine_stopped', payload.isMachineStopped ? 'true' : 'false')
    formData.append('has_affected_people', payload.hasAffectedPeople ? 'true' : 'false')
    if (typeof payload.reportDurationSeconds === 'number') {
      formData.append(
        'report_duration_seconds',
        String(Math.max(0, Math.round(payload.reportDurationSeconds)))
      )
    }
    for (const file of payload.photos ?? []) {
      formData.append('photos[]', file)
    }

    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        typeof json?.message === 'string'
          ? json.message
          : 'Gagal mengirim laporan ke server.'
      )
    }

    const caseNumber = String(
      json?.case_number ??
        json?.data?.case_number ??
        `SL-${machine.site.code}-${new Date().getFullYear()}-0001`
    )

    return {
      caseNumber,
      machineCode: machine.code,
      machineName: machine.name,
      caseTypeName: payload.caseTypeName,
      emergencyReminder:
        typeof json?.emergency_reminder === 'string'
          ? json.emergency_reminder
          : payload.showEmergencyFallback
            ? 'Ikuti prosedur darurat perusahaan terlebih dahulu! SafetyLog bukan pengganti prosedur resmi.'
            : null,
    }
  }

  const year = new Date().getFullYear()
  const randomSeq = String(Math.floor(10 + Math.random() * 89)).padStart(4, '0')
  return {
    caseNumber: `SL-${machine.site.code}-${year}-${randomSeq}`,
    machineCode: machine.code,
    machineName: machine.name,
    caseTypeName: payload.caseTypeName,
    emergencyReminder: payload.showEmergencyFallback
      ? 'Ikuti prosedur darurat perusahaan terlebih dahulu! SafetyLog bukan pengganti prosedur resmi.'
      : null,
  }
}
