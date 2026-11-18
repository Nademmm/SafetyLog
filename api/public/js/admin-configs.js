/**
 * SafetyLog | Konfigurasi Risiko & Sistem (Admin only).
 */
import { apiJson } from './api.js';
import { hasRole } from './auth.js';
import { requireAccess } from './guard.js';

if (!requireAccess() || !hasRole('admin')) {
  throw new Error('Forbidden');
}

const statusBox = document.getElementById('configFeedback');

function notify(message, isError = false) {
  statusBox.textContent = message;
  statusBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
  statusBox.hidden = false;
}

document.querySelectorAll('[data-risk-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = form.getAttribute('data-risk-form');
    const payload = {
      min_score: parseInt(form.querySelector('[name="min_score"]').value, 10),
      max_score: parseInt(form.querySelector('[name="max_score"]').value, 10),
      first_response_hours: parseInt(form.querySelector('[name="first_response_hours"]').value, 10),
      temporary_action_hours: parseInt(form.querySelector('[name="temporary_action_hours"]').value, 10),
      permanent_action_hours: parseInt(form.querySelector('[name="permanent_action_hours"]').value, 10),
      requires_preventive_action: form.querySelector('[name="requires_preventive_action"]').checked,
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await apiJson(`/risk-configs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      notify('Konfigurasi risiko berhasil disimpan.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
});

document.querySelectorAll('[data-config-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = form.getAttribute('data-config-form');
    const rawVal = form.querySelector('[name="value"]').value;
    let parsedValue = rawVal;
    try {
      parsedValue = JSON.parse(rawVal);
    } catch (_) {
      parsedValue = rawVal;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await apiJson(`/configurations/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value: parsedValue }),
      });
      notify(`Konfigurasi "${key}" berhasil diperbarui.`);
    } catch (err) {
      notify(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
});
