/**
 * SafetyLog API Client (Blade version)
 * Membaca token Sanctum dari <meta name="sl-token"> yang dirender oleh Blade layout.
 */

const API_BASE = 'http://localhost:8000/api';

function getToken() {
  const meta = document.querySelector('meta[name="sl-token"]');
  return meta ? meta.getAttribute('content') : null;
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Sesi habis, silakan login ulang.');
  }

  if (res.status === 403) {
    const err = new Error('Anda tidak memiliki akses ke halaman ini.');
    err.code = 403;
    throw err;
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After') || 60;
    const err = new Error(`Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`);
    err.code = 429;
    err.retryAfter = retryAfter;
    throw err;
  }

  return res;
}

async function apiJson(endpoint, options = {}) {
  const res = await apiRequest(endpoint, options);
  let data;
  try {
    data = await res.json();
  } catch (_) {
    throw new Error('Respons dari server tidak valid.');
  }
  if (!res.ok) {
    const msg = data && data.message ? data.message : 'Terjadi kesalahan.';
    const err = new Error(msg);
    err.status = res.status;
    err.errors = data && data.errors ? data.errors : null;
    throw err;
  }
  return data;
}

export { API_BASE, apiRequest, apiJson, getToken };
