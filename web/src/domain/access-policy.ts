import type { UserRole } from '@/types/safetylog'

export type NavSection = 'main' | 'manage' | 'admin'

export interface RoutePolicy {
  id: string
  path: string
  allowedRoles: UserRole[]
  navLabel?: string
  mobileLabel?: string
  navSection?: NavSection
  navIcon?:
    | 'home'
    | 'scan'
    | 'file-text'
    | 'wrench'
    | 'inbox'
    | 'dashboard'
    | 'audit'
    | 'machines'
    | 'users'
    | 'config'
}

export const ROUTE_ALLOWED_ROLES = {
  pelaporHome: ['reporter', 'admin'] as UserRole[],
  supervisorHome: ['supervisor', 'admin'] as UserRole[],
  k3Home: ['hse', 'admin'] as UserRole[],
  adminHome: ['admin'] as UserRole[],
  report: ['reporter'] as UserRole[],
  myCases: ['reporter'] as UserRole[],
  myActions: ['reporter'] as UserRole[],
  casesQueue: ['supervisor', 'hse', 'admin'] as UserRole[],
  dashboard: ['supervisor', 'hse', 'admin'] as UserRole[],
  machineHistory: ['supervisor', 'hse', 'admin'] as UserRole[],
  auditLogs: ['supervisor', 'hse', 'admin'] as UserRole[],
  adminMachines: ['admin'] as UserRole[],
  adminUsers: ['admin'] as UserRole[],
  adminConfig: ['admin'] as UserRole[],
}

export const NAV_POLICIES: RoutePolicy[] = [
  {
    id: 'home',
    path: '/',
    allowedRoles: ['reporter', 'supervisor', 'hse', 'admin'],
    navLabel: 'Beranda Peran',
    mobileLabel: 'Beranda',
    navSection: 'main',
    navIcon: 'home',
  },
  {
    id: 'report',
    path: '/report',
    allowedRoles: ROUTE_ALLOWED_ROLES.report,
    navLabel: 'Lapor Cepat (QR)',
    mobileLabel: 'Lapor',
    navSection: 'main',
    navIcon: 'scan',
  },
  {
    id: 'my-cases',
    path: '/my-cases',
    allowedRoles: ROUTE_ALLOWED_ROLES.myCases,
    navLabel: 'Kasus Saya',
    mobileLabel: 'Kasus',
    navSection: 'main',
    navIcon: 'file-text',
  },
  {
    id: 'my-actions',
    path: '/my-actions',
    allowedRoles: ROUTE_ALLOWED_ROLES.myActions,
    navLabel: 'Tindakan Saya',
    mobileLabel: 'Tindakan',
    navSection: 'main',
    navIcon: 'wrench',
  },
  {
    id: 'cases',
    path: '/cases',
    allowedRoles: ROUTE_ALLOWED_ROLES.casesQueue,
    navLabel: 'Antrean Kasus',
    mobileLabel: 'Antrean',
    navSection: 'manage',
    navIcon: 'inbox',
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    allowedRoles: ROUTE_ALLOWED_ROLES.dashboard,
    navLabel: 'Dashboard K3',
    mobileLabel: 'Dashboard',
    navSection: 'manage',
    navIcon: 'dashboard',
  },
  {
    id: 'audit-logs',
    path: '/audit-logs',
    allowedRoles: ROUTE_ALLOWED_ROLES.auditLogs,
    navLabel: 'Log Audit',
    mobileLabel: 'Audit',
    navSection: 'manage',
    navIcon: 'audit',
  },
  {
    id: 'admin-machines',
    path: '/admin/machines',
    allowedRoles: ROUTE_ALLOWED_ROLES.adminMachines,
    navLabel: 'Mesin, Area & QR',
    mobileLabel: 'Mesin',
    navSection: 'admin',
    navIcon: 'machines',
  },
  {
    id: 'admin-users',
    path: '/admin/users',
    allowedRoles: ROUTE_ALLOWED_ROLES.adminUsers,
    navLabel: 'Pengguna & Peran',
    mobileLabel: 'Pengguna',
    navSection: 'admin',
    navIcon: 'users',
  },
  {
    id: 'admin-config',
    path: '/admin/config',
    allowedRoles: ROUTE_ALLOWED_ROLES.adminConfig,
    navLabel: 'Konfigurasi Sistem',
    mobileLabel: 'Konfig',
    navSection: 'admin',
    navIcon: 'config',
  },
]

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case 'reporter':
      return '/pelapor'
    case 'supervisor':
      return '/supervisor'
    case 'hse':
      return '/k3'
    case 'admin':
      return '/admin'
  }
}

export function canRoleAccessRoute(path: string, role: UserRole): boolean {
  const clean = path.split('?')[0]
  if (clean === '/pelapor') return ROUTE_ALLOWED_ROLES.pelaporHome.includes(role)
  if (clean === '/supervisor') return ROUTE_ALLOWED_ROLES.supervisorHome.includes(role)
  if (clean === '/k3') return ROUTE_ALLOWED_ROLES.k3Home.includes(role)
  if (clean === '/admin' || clean.startsWith('/admin/')) {
    return ROUTE_ALLOWED_ROLES.adminHome.includes(role)
  }
  if (
    clean === '/cases' ||
    clean === '/dashboard' ||
    clean === '/audit-logs' ||
    clean.startsWith('/machines/')
  ) {
    return ROUTE_ALLOWED_ROLES.casesQueue.includes(role)
  }
  if (
    clean === '/report' ||
    clean.startsWith('/qr/') ||
    clean === '/my-cases' ||
    clean === '/my-actions'
  ) {
    return ROUTE_ALLOWED_ROLES.report.includes(role)
  }
  if (clean.startsWith('/cases/')) {
    return true
  }
  return false
}

export function isRedirectAllowedForRole(path: string | null, role: UserRole): boolean {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return false
  }
  const clean = path.split('?')[0]
  if (clean === '/' || clean === '/login') return false
  return canRoleAccessRoute(clean, role)
}

export function getNavPoliciesForRole(role: UserRole): RoutePolicy[] {
  return NAV_POLICIES.filter((item) => item.allowedRoles.includes(role)).map((item) =>
    item.id === 'home' ? { ...item, path: roleHomePath(role) } : item,
  )
}

export function getMobileBottomPoliciesForRole(role: UserRole): RoutePolicy[] {
  const home: RoutePolicy = {
    id: 'home',
    path: roleHomePath(role),
    allowedRoles: [role],
    mobileLabel: 'Beranda',
    navIcon: 'home',
  }

  if (role === 'reporter') {
    return [
      home,
      NAV_POLICIES.find((p) => p.id === 'report')!,
      NAV_POLICIES.find((p) => p.id === 'my-cases')!,
      NAV_POLICIES.find((p) => p.id === 'my-actions')!,
    ]
  }

  if (role === 'admin') {
    return [
      home,
      NAV_POLICIES.find((p) => p.id === 'cases')!,
      NAV_POLICIES.find((p) => p.id === 'dashboard')!,
      NAV_POLICIES.find((p) => p.id === 'admin-machines')!,
    ]
  }

  return [
    home,
    NAV_POLICIES.find((p) => p.id === 'cases')!,
    NAV_POLICIES.find((p) => p.id === 'dashboard')!,
    NAV_POLICIES.find((p) => p.id === 'audit-logs')!,
  ]
}
