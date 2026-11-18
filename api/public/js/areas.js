/**
 * SafetyLog | Kelola Area (B-06), Admin only.
 * Logika & keamanan: role dicek di frontend (defense-in-depth),
 * backend juga menolak HTTP 403 untuk non-admin / organisasi lain.
 */

import { apiJson } from './api.js';
import { hasRole } from './auth.js';
import { requireAccess } from './guard.js';

if (!requireAccess() || !hasRole('admin')) {
  throw new Error('Forbidden');
}

const container = document.getElementById('areasContainer');
const alertEl = document.getElementById('alert');
const alertSuccess = document.getElementById('alertSuccess');

const modal = document.getElementById('modalArea');
const btnAdd = document.getElementById('btnAddArea');
const btnClose = document.getElementById('btnCloseArea');
const btnCancel = document.getElementById('btnCancelArea');
const form = document.getElementById('formArea');
const modalTitle = document.getElementById('modalAreaTitle');
const btnSave = document.getElementById('btnSaveArea');

let areas = window.__AREAS_INIT || [];
if (container?.dataset.areas) {
  try {
    areas = JSON.parse(container.dataset.areas);
  } catch (_) {
    areas = [];
  }
}
let editingId = null;

function showAlert(msg, isSuccess = false) {
  alertEl.style.display = 'none';
  alertSuccess.style.display = 'none';
  if (isSuccess) {
    alertSuccess.textContent = msg;
    alertSuccess.style.display = 'block';
  } else {
    alertEl.textContent = msg;
    alertEl.style.display = 'block';
  }
}

window.app = {
  editArea(id) {
    const a = areas.find(x => x.id === id);
    if (!a) return;
    editingId = id;
    modalTitle.textContent = 'Ubah Area';
    document.getElementById('areaId').value = a.id;
    document.getElementById('areaSiteId').value = a.site_id;
    document.getElementById('areaName').value = a.name;
    document.getElementById('areaActive').checked = a.is_active && !a.archived_at;
    modal.classList.add('open');
  },
  async toggleArchive(id, isActive) {
    if (!confirm(isActive ? 'Arsipkan area ini?' : 'Aktifkan kembali area ini?')) return;
    try {
      await apiJson(`/areas/${id}/archive`, { method: 'POST' });
      showAlert(isActive ? 'Area berhasil diarsipkan.' : 'Area diaktifkan kembali.', true);
      location.reload();
    } catch (err) {
      showAlert('Gagal: ' + err.message);
    }
  },
};

document.querySelectorAll('[data-edit-area]').forEach(btn => {
  btn.addEventListener('click', () => {
    window.app.editArea(parseInt(btn.getAttribute('data-edit-area'), 10));
  });
});

document.querySelectorAll('[data-toggle-area]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = parseInt(btn.getAttribute('data-toggle-area'), 10);
    const isActive = btn.getAttribute('data-active') === '1';
    window.app.toggleArchive(id, isActive);
  });
});

btnAdd.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Tambah Area';
  form.reset();
  document.getElementById('areaActive').checked = true;
  document.getElementById('areaId').value = '';
  modal.classList.add('open');
});

[btnClose, btnCancel].forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    modal.classList.remove('open');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnSave.disabled = true;
  btnSave.textContent = 'Menyimpan...';

  const payload = {
    site_id: parseInt(document.getElementById('areaSiteId').value, 10),
    name: document.getElementById('areaName').value.trim(),
    is_active: document.getElementById('areaActive').checked,
  };

  try {
    if (editingId) {
      await apiJson(`/areas/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showAlert('Area berhasil diperbarui.', true);
    } else {
      await apiJson('/areas', { method: 'POST', body: JSON.stringify(payload) });
      showAlert('Area berhasil ditambahkan.', true);
    }
    modal.classList.remove('open');
    location.reload();
  } catch (err) {
    showAlert('Gagal menyimpan: ' + err.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = 'Simpan';
  }
});

// Data awal sudah di-render oleh Blade (@foreach). JS hanya menangani CRUD via API.
