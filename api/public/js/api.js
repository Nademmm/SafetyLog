/**
 * SafetyLog API Client
 * Membaca token Sanctum dari <meta name="sl-token"> yang dirender server setelah login.
 */

const API_BASE = `${window.location.origin}/api`;

function getToken() {
  const meta = document.querySelector('meta[name="sl-token"]');
  return meta ? meta.getAttribute('content') : null;
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?return_url=${returnUrl}`;
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
  }

  return res;
}

async function apiJson(endpoint, options = {}) {
  const res = await apiRequest(endpoint, options);
  let data = null;

  try {
    data = await res.json();
  } catch (_) {
    if (!res.ok) {
      throw new Error('Respons dari server tidak valid.');
    }
    return null;
  }

  if (!res.ok) {
    const msg = data && data.message ? data.message : 'Terjadi kesalahan pada permintaan.';
    const err = new Error(msg);
    err.status = res.status;
    err.code = res.status;
    err.error_code = data && data.error_code ? data.error_code : null;
    err.errors = data && data.errors ? data.errors : null;
    throw err;
  }

  return data;
}

export { API_BASE, apiRequest, apiJson, getToken };
