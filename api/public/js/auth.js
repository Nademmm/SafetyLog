/**
 * SafetyLog Auth Helper
 */
import { getToken } from './api.js';

const ROLES = ['reporter', 'supervisor', 'hse', 'admin'];

export function getUser() {
  const meta = document.querySelector('meta[name="sl-user"]');
  if (!meta) return null;
  try {
    return JSON.parse(meta.getAttribute('content'));
  } catch (_) {
    return null;
  }
}

export function isAuthenticated() {
  return !!getToken() && !!getUser();
}

export function hasRole(allowedRoles) {
  const user = getUser();
  if (!user) return false;
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }
  return user.role === allowedRoles;
}

export function allRoles() {
  return ROLES;
}

export function logout() {
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/logout';

  if (csrfMeta) {
    const csrf = document.createElement('input');
    csrf.type = 'hidden';
    csrf.name = '_token';
    csrf.value = csrfMeta.content;
    form.appendChild(csrf);
  }

  document.body.appendChild(form);
  form.submit();
}
