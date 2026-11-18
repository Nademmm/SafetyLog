/**
 * SafetyLog Route Guard (boilerplate B-05)
 * Halaman yang bukan hak peran ditolak — bukan hanya disembunyikan.
 * Backend juga menolak dengan HTTP 403 (defense in depth).
 */

import { getUser, isAuthenticated, hasRole, logout } from './auth.js';

/**
 * Role yang diizinkan untuk setiap halaman.
 * Tanpa daftar = semua role yang login bisa akses.
 */
const PAGE_ROLES = {
  '/dashboard': ['reporter', 'supervisor', 'hse', 'admin'],
  '/areas': ['admin'],
  '/machines': ['admin'],
};

/** Path halaman login. */
const LOGIN_PAGE = '/login';

/**
 * Periksa akses halaman saat ini berdasarkan role user.
 * Jika tidak login -> arahkan ke login.
 * Jika role tidak diizinkan -> tampilkan pesan 403 dan hentikan rendering konten.
 */
export function requireAccess() {
  const path = window.location.pathname;

  if (path === LOGIN_PAGE) {
    if (isAuthenticated()) {
      window.location.href = '/dashboard';
    }
    return;
  }

  if (!isAuthenticated()) {
    sessionStorage.setItem('sl_return_url', path);
    window.location.href = LOGIN_PAGE;
    return;
  }

  const allowed = PAGE_ROLES[path];
  if (allowed && !hasRole(allowed)) {
    showForbidden(path);
    return;
  }

  sessionStorage.removeItem('sl_return_url');
}

/** Tampilkan halaman 403 sederhana. */
function showForbidden(page) {
  const user = getUser();
  document.body.innerHTML = `
    <div style="font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1rem; max-width: 420px; margin: 0 auto;">
      <h1 style="color: #dc2626;">403 — Akses Ditolak</h1>
      <p>Anda login sebagai <strong>${user ? user.role : '—'}</strong> (${user ? user.email : '—'}).</p>
      <p>Halaman <em>${page}</em> hanya dapat diakses oleh peran yang berwenang.</p>
      <p>Ini bukan hanya disembunyikan — backend juga menolak permintaan dengan HTTP 403.</p>
      <hr style="margin: 2rem 0;">
      <a href="/dashboard" style="display: inline-block; padding: 0.6rem 1.2rem; background: #2563eb; color: #fff; text-decoration: none; border-radius: 0.5rem;">Kembali ke Dashboard</a>
      <button id="btnLogout" type="button" style="display: inline-block; margin-left: 0.5rem; padding: 0.6rem 1.2rem; background: #ef4444; color: #fff; border: 0; border-radius: 0.5rem; cursor: pointer;">Logout</button>
    </div>
  `;
  document.getElementById('btnLogout').addEventListener('click', (event) => {
    event.preventDefault();
    logout();
  });
}

/** Dapatkan role yang diizinkan untuk halaman saat ini (untuk menampilkan/menyembunyikan tombol opsional). */
export function allowedRolesForCurrentPage() {
  return PAGE_ROLES[window.location.pathname] || [];
}
