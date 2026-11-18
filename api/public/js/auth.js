/**
 * SafetyLog Auth (Blade version)
 * Token dibaca dari <meta name="sl-token"> yang diset oleh Blade layout setelah login.
 * Role & profil dibaca dari <meta name="sl-user">.
 */

import { getToken } from './api.js';

const ROLES = ['reporter', 'supervisor', 'hse', 'admin'];

/** Ambil data user dari meta tag yang dirender Blade. */
export function getUser() {
  const meta = document.querySelector('meta[name="sl-user"]');
  return meta ? JSON.parse(meta.getAttribute('content')) : null;
}

/** Cek apakah pengguna sudah login (token ada di meta tag). */
export function isAuthenticated() {
  return !!getToken() && !!getUser();
}

/** Cek apakah role user termasuk dalam daftar yang diizinkan. */
export function hasRole(allowedRoles) {
  const user = getUser();
  if (!user) return false;
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }
  return user.role === allowedRoles;
}

/** Daftar semua role yang tersedia. */
export function allRoles() {
  return ROLES;
}

/** Logout: arahkan ke route logout yang dihandle PHP controller. */
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
