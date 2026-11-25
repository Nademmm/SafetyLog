import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  apiFetch,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
} from '@/lib/api'
import { AuthContext } from '@/lib/auth-helpers'
import { unwrapUser } from '@/data/normalizers'
import type { User, UserRole } from '@/types/safetylog'

async function fetchCurrentUser(): Promise<User | null> {
  const res = await apiFetch<{ data?: User; user?: User }>('/auth/me')
  return unwrapUser(res)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(() => Boolean(getStoredToken()))

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      queryClient.clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

  const refreshUser = React.useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      setUser(await fetchCurrentUser())
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setStoredToken(null)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const token = getStoredToken()
    if (!token) return
    let active = true
    fetchCurrentUser()
      .then((resolved) => {
        if (!active) return
        setUser(resolved)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setStoredToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        json: { email, password, device_name: 'safetylog-web' },
      })
      queryClient.clear()
      setStoredToken(res.token)
      setUser(res.user)
      return res.user
    },
    [queryClient],
  )

  const logout = React.useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // ignore if token already expired
    } finally {
      setStoredToken(null)
      setUser(null)
      queryClient.clear()
    }
  }, [queryClient])

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
