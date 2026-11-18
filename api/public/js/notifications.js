/**
 * SafetyLog | Notifikasi Dalam Aplikasi (B-18).
 */
import { apiJson } from './api.js';
import { requireAccess } from './guard.js';

if (!requireAccess()) {
  throw new Error('Unauthorized');
}

document.getElementById('btnMarkAllRead')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    await apiJson('/notifications/read-all', { method: 'POST' });
    location.reload();
  } finally {
    btn.disabled = false;
  }
});

document.querySelectorAll('[data-mark-read]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-mark-read');
    btn.disabled = true;
    try {
      await apiJson(`/notifications/${id}/read`, { method: 'POST' });
      location.reload();
    } finally {
      btn.disabled = false;
    }
  });
});
