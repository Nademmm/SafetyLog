/**
 * SafetyLog | Form Lapor Kasus (B-08, B-10).
 */
import { apiJson } from './api.js';
import { getUser } from './auth.js';
import { requireAccess } from './guard.js';

if (!requireAccess()) {
  throw new Error('Unauthorized');
}

const form = document.getElementById('reportCaseForm');
const machineSelect = document.getElementById('machine_id');
const warningBox = document.getElementById('openCasesWarning');
const warningList = document.getElementById('openCasesList');
const errorBox = document.getElementById('reportError');
const successBox = document.getElementById('reportSuccess');
const submitBtn = document.getElementById('btnSubmitReport');

const currentUser = getUser();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

async function checkOpenCases(machineId) {
  if (!machineId) {
    warningBox.hidden = true;
    return;
  }

  try {
    const res = await apiJson(`/machines/${machineId}/open-cases`);
    renderOpenCasesWarning(res);
  } catch (_) {
    warningBox.hidden = true;
  }
}

function renderOpenCasesWarning(payload) {
  if (!payload || !payload.has_open_cases || !Array.isArray(payload.cases) || payload.cases.length === 0) {
    warningBox.hidden = true;
    warningList.innerHTML = '';
    return;
  }

  const canViewAll = currentUser && currentUser.role !== 'reporter';
  warningList.innerHTML = payload.cases.map((item) => {
    const title = `<strong class="mono">${escapeHtml(item.case_number)}</strong> (${escapeHtml(item.status_label)})`;
    const link = canViewAll
      ? `<a href="/cases/${item.id}">${title}</a>`
      : title;

    return `<li>${link}: ${escapeHtml(item.short_description)}</li>`;
  }).join('');

  warningBox.hidden = false;
}

let initOpenCases = window.__OPEN_CASES_INIT || [];
if (form?.dataset.openCases) {
  try {
    initOpenCases = JSON.parse(form.dataset.openCases);
  } catch (_) {
    initOpenCases = [];
  }
}

if (Array.isArray(initOpenCases) && initOpenCases.length > 0) {
  renderOpenCasesWarning({
    has_open_cases: true,
    cases: initOpenCases,
  });
}

machineSelect?.addEventListener('change', (e) => {
  checkOpenCases(e.target.value);
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  successBox.hidden = true;

  const formData = new FormData(form);
  formData.set('is_machine_stopped', document.getElementById('is_machine_stopped').checked ? '1' : '0');
  formData.set('has_affected_people', document.getElementById('has_affected_people').checked ? '1' : '0');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengirim laporan...';

  try {
    const res = await apiJson('/cases', {
      method: 'POST',
      body: formData,
    });

    const created = res.data;
    let html = `
      <strong>Laporan berhasil dicatat.</strong>
      Nomor kasus: <span class="mono">${escapeHtml(created.case_number)}</span>
      (<a href="/cases/${created.id}">Lihat detail kasus</a>).
    `;

    if (res.emergency_reminder) {
      html += `<div class="alert alert-warning" style="margin-top:0.75rem; margin-bottom:0;"><strong>Pengingat Darurat:</strong> ${escapeHtml(res.emergency_reminder)}</div>`;
    }

    successBox.innerHTML = html;
    successBox.hidden = false;
    form.reset();
    warningBox.hidden = true;
    successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    const detail = err.errors
      ? Object.values(err.errors).flat().join(' ')
      : err.message;
    errorBox.textContent = detail || 'Gagal mengirim laporan.';
    errorBox.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kirim Laporan';
  }
});
