/**
 * SafetyLog — Kelola Mesin (B-06), Admin only.
 * Keamanan utama: qr_token dihasilkan oleh backend via Str::random(24),
 * bukan nomor urut yang bisa ditebak. Frontend tidak boleh men-input qr_token.
 */

import { apiJson } from './api.js';
import { hasRole } from './auth.js';
import { requireAccess } from './guard.js';

requireAccess();
if (!hasRole('admin')) {
  document.body.innerHTML = '<div style="padding:2rem; text-align:center; font-family:sans-serif;">Akses ditolak. Hanya admin yang dapat kelola mesin.</div>';
  throw new Error('Forbidden');
}

const tblBody = document.querySelector('#tblMachines tbody');
const alertEl = document.getElementById('alert');
const alertSuccess = document.getElementById('alertSuccess');

const modal = document.getElementById('modalMachine');
const btnAdd = document.getElementById('btnAddMachine');
const btnClose = document.getElementById('btnCloseMachine');
const btnCancel = document.getElementById('btnCancelMachine');
const form = document.getElementById('formMachine');
const modalTitle = document.getElementById('modalMachineTitle');
const btnSave = document.getElementById('btnSaveMachine');

let areas = window.__MACHINES_AREAS || [];
let machines = window.__MACHINES_INIT || [];
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
  editMachine(id) {
    const m = machines.find(x => x.id === id);
    if (!m) return;
    editingId = id;
    modalTitle.textContent = 'Ubah Mesin';
    document.getElementById('machineId').value = m.id;
    document.getElementById('machineAreaId').value = m.area_id;
    document.getElementById('machineCode').value = m.code;
    document.getElementById('machineName').value = m.name;
    document.getElementById('machineDesc').value = m.description ?? '';
    document.getElementById('machineActive').checked = m.is_active && !m.archived_at;
    modal.classList.add('open');
  },
  async toggleArchive(id, isActive) {
    if (!confirm(isActive ? 'Arsipkan mesin ini?' : 'Aktifkan kembali mesin ini?')) return;
    try {
      await apiJson(`/machines/${id}/archive`, { method: 'POST' });
      showAlert(isActive ? 'Mesin berhasil diarsipkan.' : 'Mesin diaktifkan kembali.', true);
      location.reload();
    } catch (err) {
      showAlert('Gagal: ' + err.message);
    }
  },
};

btnAdd.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Tambah Mesin';
  form.reset();
  document.getElementById('machineCode').value = 'Dihasilkan otomatis';
  document.getElementById('machineActive').checked = true;
  document.getElementById('machineId').value = '';
  // qr_token tidak ada di form — di-generate oleh backend saat create
  modal.classList.add('open');
});

[btnClose, btnCancel].forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnSave.disabled = true;
  btnSave.textContent = 'Menyimpan...';

  const payload = {
    area_id: parseInt(document.getElementById('machineAreaId').value, 10),
    name: document.getElementById('machineName').value.trim(),
    description: document.getElementById('machineDesc').value.trim() || null,
    is_active: document.getElementById('machineActive').checked,
  };

  try {
    if (editingId) {
      await apiJson(`/machines/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showAlert('Mesin berhasil diperbarui.', true);
      modal.classList.remove('open');
      location.reload();
    } else {
      await apiJson('/machines', { method: 'POST', body: JSON.stringify(payload) });
      showAlert('Mesin berhasil ditambahkan.', true);
    }
    modal.classList.remove('open');
  } catch (err) {
    showAlert('Gagal menyimpan: ' + err.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = 'Simpan';
  }
});

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

// Data awal sudah di-render oleh Blade (@foreach). JS hanya menangani CRUD via API.
