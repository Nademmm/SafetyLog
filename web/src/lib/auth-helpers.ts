import * as React from 'react'
import type { User, UserRole } from '@/types/safetylog'

export { roleHomePath, isRedirectAllowedForRole } from '@/domain/access-policy'

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

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider')
  }
  return ctx
}
