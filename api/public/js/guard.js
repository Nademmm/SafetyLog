/**
 * SafetyLog Route Guard (defense-in-depth di client selain HTTP 403 server-side).
 */
import { getUser, isAuthenticated, hasRole } from './auth.js';

const PAGE_ROLES = {
  '/dashboard': ['reporter', 'supervisor', 'hse', 'admin'],
  '/cases/create': ['reporter', 'supervisor', 'hse', 'admin'],
  '/my-cases': ['reporter', 'supervisor', 'hse', 'admin'],
  '/my-actions': ['reporter', 'supervisor', 'hse', 'admin'],
  '/notifications': ['reporter', 'supervisor', 'hse', 'admin'],
  '/cases': ['supervisor', 'hse', 'admin'],
  '/audit-logs': ['supervisor', 'hse', 'admin'],
  '/sites': ['admin'],
  '/areas': ['admin'],
  '/machines': ['admin'],
  '/users': ['admin'],
  '/configurations': ['admin'],
};

export function requireAccess() {
  const path = window.location.pathname;
  if (path === '/login' || path === '/') {
    return true;
  }

  if (!isAuthenticated()) {
    const returnUrl = encodeURIComponent(path + window.location.search);
    window.location.href = `/login?return_url=${returnUrl}`;
    return false;
  }

  const allowed = PAGE_ROLES[path];
  if (allowed && !hasRole(allowed)) {
    return false;
  }

  return true;
}

export function allowedRolesForCurrentPage() {
  return PAGE_ROLES[window.location.pathname] || [];
}

export function currentUserRole() {
  return getUser()?.role || null;
}
