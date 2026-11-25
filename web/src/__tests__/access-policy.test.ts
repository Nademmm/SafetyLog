import { describe, expect, it } from 'vitest'
import {
  canRoleAccessRoute,
  getMobileBottomPoliciesForRole,
  getNavPoliciesForRole,
  isRedirectAllowedForRole,
  roleHomePath,
} from '@/domain/access-policy'

describe('access-policy', () => {
  it('maps each role to its dedicated home path', () => {
    expect(roleHomePath('reporter')).toBe('/pelapor')
    expect(roleHomePath('supervisor')).toBe('/supervisor')
    expect(roleHomePath('hse')).toBe('/k3')
    expect(roleHomePath('admin')).toBe('/admin')
  })

  it('rejects open redirects and login/root redirects', () => {
    expect(isRedirectAllowedForRole(null, 'admin')).toBe(false)
    expect(isRedirectAllowedForRole('', 'admin')).toBe(false)
    expect(isRedirectAllowedForRole('//evil.com', 'admin')).toBe(false)
    expect(isRedirectAllowedForRole('/\\evil.com', 'admin')).toBe(false)
    expect(isRedirectAllowedForRole('https://evil.com', 'admin')).toBe(false)
    expect(isRedirectAllowedForRole('/', 'reporter')).toBe(false)
    expect(isRedirectAllowedForRole('/login', 'supervisor')).toBe(false)
  })

  it('enforces strict role boundaries on operational and admin routes', () => {
    expect(canRoleAccessRoute('/report', 'reporter')).toBe(true)
    expect(canRoleAccessRoute('/report', 'admin')).toBe(false)
    expect(canRoleAccessRoute('/report', 'supervisor')).toBe(false)

    expect(canRoleAccessRoute('/cases', 'reporter')).toBe(false)
    expect(canRoleAccessRoute('/cases', 'supervisor')).toBe(true)
    expect(canRoleAccessRoute('/cases', 'hse')).toBe(true)
    expect(canRoleAccessRoute('/cases', 'admin')).toBe(true)

    expect(canRoleAccessRoute('/admin/machines', 'admin')).toBe(true)
    expect(canRoleAccessRoute('/admin/machines', 'hse')).toBe(false)
    expect(canRoleAccessRoute('/admin/users', 'supervisor')).toBe(false)

    expect(canRoleAccessRoute('/cases/42', 'reporter')).toBe(true)
    expect(canRoleAccessRoute('/cases/42', 'hse')).toBe(true)
  })

  it('resolves role-specific navigation and 4 mobile bottom bar slots', () => {
    const roles = ['reporter', 'supervisor', 'hse', 'admin'] as const
    for (const role of roles) {
      const nav = getNavPoliciesForRole(role)
      expect(nav[0].path).toBe(roleHomePath(role))
      const bottom = getMobileBottomPoliciesForRole(role)
      expect(bottom).toHaveLength(4)
      expect(bottom[0].path).toBe(roleHomePath(role))
    }
  })
})
