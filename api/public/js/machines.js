/**
 * SafetyLog | Kelola Mesin (B-06), Admin only.
 * Keamanan utama: qr_token dihasilkan oleh backend via Str::random(24),
 * bukan nomor urut yang bisa ditebak. Frontend tidak boleh men-input qr_token.
 */

import { apiJson } from './api.js';
import { hasRole } from './auth.js';
import { requireAccess } from './guard.js';

if (!requireAccess() || !hasRole('admin')) {
  throw new Error('Forbidden');
}

const alertEl = document.getElementById('alert');
const alertSuccess = document.getElementById('alertSuccess');

const modal = document.getElementById('modalMachine');
const btnAdd = document.getElementById('btnAddMachine');
const btnClose = document.getElementById('btnCloseMachine');
const btnCancel = document.getElementById('btnCancelMachine');
const form = document.getElementById('formMachine');
const container = document.getElementById('machinesContainer');
const modalTitle = document.getElementById('modalMachineTitle');
const btnSave = document.getElementById('btnSaveMachine');

let machines = window.__MACHINES_INIT || [];
if (container?.dataset.machines) {
  try {
    machines = JSON.parse(container.dataset.machines);
  } catch (_) {
    machines = [];
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
  editMachine(id) {
    const m = machines.find((x) => x.id === id);
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

document.querySelectorAll('[data-edit-machine]').forEach((btn) => {
  btn.addEventListener('click', () => {
    window.app.editMachine(parseInt(btn.getAttribute('data-edit-machine'), 10));
  });
});

document.querySelectorAll('[data-toggle-machine]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = parseInt(btn.getAttribute('data-toggle-machine'), 10);
    const isActive = btn.getAttribute('data-active') === '1';
    window.app.toggleArchive(id, isActive);
  });
});

btnAdd.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Tambah Mesin';
  form.reset();
  document.getElementById('machineCode').value = 'Dihasilkan otomatis';
  document.getElementById('machineActive').checked = true;
  document.getElementById('machineId').value = '';
  modal.classList.add('open');
});

[btnClose, btnCancel].forEach((b) => b.addEventListener('click', () => modal.classList.remove('open')));
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
    area_id: parseInt(document.getElementById('machineAreaId').value, 10),
    name: document.getElementById('machineName').value.trim(),
    description: document.getElementById('machineDesc').value.trim() || null,
    is_active: document.getElementById('machineActive').checked,
  };

  try {
    if (editingId) {
      await apiJson(`/machines/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showAlert('Mesin berhasil diperbarui.', true);
    } else {
      await apiJson('/machines', { method: 'POST', body: JSON.stringify(payload) });
      showAlert('Mesin berhasil ditambahkan.', true);
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
