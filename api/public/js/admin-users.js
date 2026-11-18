/**
 * SafetyLog | Kelola Pengguna & 4 Peran (Admin only).
 */
import { apiJson } from './api.js';
import { hasRole } from './auth.js';
import { requireAccess } from './guard.js';

if (!requireAccess() || !hasRole('admin')) {
  throw new Error('Forbidden');
}

const container = document.getElementById('usersContainer');
const dialog = document.getElementById('userDialog');
const form = document.getElementById('userForm');
const feedback = document.getElementById('userFormError');
const titleEl = document.getElementById('userDialogTitle');
let users = window.__USERS_INIT || [];
if (container?.dataset.users) {
  try {
    users = JSON.parse(container.dataset.users);
  } catch (_) {
    users = [];
  }
}
let editingId = null;

document.getElementById('btnAddUser')?.addEventListener('click', () => {
  editingId = null;
  titleEl.textContent = 'Tambah Pengguna Baru';
  form.reset();
  document.getElementById('userEmail').disabled = false;
  document.getElementById('userPassword').required = true;
  document.getElementById('userPasswordHint').textContent = 'Minimal 8 karakter.';
  document.getElementById('userActive').checked = true;
  feedback.hidden = true;
  dialog.showModal();
});

document.querySelectorAll('[data-edit-user]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = parseInt(btn.getAttribute('data-edit-user'), 10);
    const user = users.find((u) => u.id === id);
    if (!user) return;

    editingId = id;
    titleEl.textContent = 'Ubah Pengguna';
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userEmail').disabled = true;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userSiteId').value = user.site_id ?? '';
    document.getElementById('userJobTitle').value = user.job_title ?? '';
    document.getElementById('userActive').checked = !!user.is_active;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('userPasswordHint').textContent = 'Kosongkan jika tidak ingin mengubah password.';
    feedback.hidden = true;
    dialog.showModal();
  });
});

document.getElementById('btnCloseUserDialog')?.addEventListener('click', () => dialog.close());

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.hidden = true;

  const payload = {
    name: document.getElementById('userName').value.trim(),
    role: document.getElementById('userRole').value,
    site_id: document.getElementById('userSiteId').value ? parseInt(document.getElementById('userSiteId').value, 10) : null,
    job_title: document.getElementById('userJobTitle').value.trim() || null,
    is_active: document.getElementById('userActive').checked,
  };

  const password = document.getElementById('userPassword').value;
  if (!editingId) {
    payload.email = document.getElementById('userEmail').value.trim();
    payload.password = password;
  } else if (password) {
    payload.password = password;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    if (editingId) {
      await apiJson(`/users/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await apiJson('/users', { method: 'POST', body: JSON.stringify(payload) });
    }
    dialog.close();
    location.reload();
  } catch (err) {
    const detail = err.errors ? Object.values(err.errors).flat().join(' ') : err.message;
    feedback.textContent = detail;
    feedback.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
