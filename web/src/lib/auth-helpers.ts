import * as React from 'react'
import type { User, UserRole } from '@/types/safetylog'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
}

export const AuthContext = React.createContext<AuthContextValue | null>(null)

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

export function isRedirectAllowedForRole(path: string | null, role: UserRole): boolean {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return false
  }
  const clean = path.split('?')[0]

  if (clean === '/' || clean === '/login') return false
  if (clean === '/pelapor') return role === 'reporter' || role === 'admin'
  if (clean === '/supervisor') return role === 'supervisor' || role === 'admin'
  if (clean === '/k3') return role === 'hse' || role === 'admin'
  if (clean === '/admin' || clean.startsWith('/admin/')) return role === 'admin'
  if (
    clean === '/cases' ||
    clean === '/dashboard' ||
    clean === '/audit-logs' ||
    clean.startsWith('/machines/')
  ) {
    return role === 'supervisor' || role === 'hse' || role === 'admin'
  }

  if (clean === '/report' || clean.startsWith('/qr/') || clean === '/my-cases' || clean === '/my-actions') {
    return role === 'reporter'
  }

  // Case detail routes (/cases/:id)
  return true
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider')
  }
  return ctx
}
