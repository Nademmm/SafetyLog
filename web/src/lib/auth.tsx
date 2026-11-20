import * as React from 'react'
import { apiFetch, getStoredToken, setStoredToken } from '@/lib/api'
import type { User, UserRole } from '@/types/safetylog'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

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
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false
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

  if (clean === '/report' || clean.startsWith('/qr/') || clean === '/my-cases') {
    return role === 'reporter'
  }
  if (clean === '/my-actions') {
    return role === 'reporter' || role === 'supervisor'
  }

  // Case detail routes (/cases/:id)
  return true
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(() => Boolean(getStoredToken()))

  const refreshUser = React.useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const res = await apiFetch<{ data?: User; user?: User }>('/auth/me')
      setUser(res.data || res.user || (res as unknown as User))
    } catch {
      setStoredToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      json: { email, password, device_name: 'safetylog-web' },
    })
    setStoredToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // ignore if token already expired
    } finally {
      setStoredToken(null)
      setUser(null)
    }
  }, [])

  const hasRole = React.useCallback(
    (roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider')
  }
  return ctx
}
