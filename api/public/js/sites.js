import { apiJson } from './api.js';
import { hasRole } from './auth.js';
import { requireAccess } from './guard.js';

requireAccess();
if (!hasRole('admin')) {
  document.body.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif;">Akses ditolak. Hanya admin yang dapat kelola pabrik.</div>';
  throw new Error('Forbidden');
}

const modal = document.getElementById('modalSite');
const form = document.getElementById('formSite');
const alertEl = document.getElementById('alert');
const alertSuccess = document.getElementById('alertSuccess');
const btnSave = document.getElementById('btnSaveSite');
let sites = window.__SITES_INIT || [];
let editingId = null;

function showAlert(message, success = false) {
  alertEl.style.display = 'none';
  alertSuccess.style.display = 'none';
  const target = success ? alertSuccess : alertEl;
  target.textContent = message;
  target.style.display = 'block';
}

window.app = {
  editSite(id) {
    const site = sites.find(item => item.id === id);
    if (!site) return;
    editingId = id;
    document.getElementById('modalSiteTitle').textContent = 'Ubah Pabrik';
    document.getElementById('siteId').value = site.id;
    document.getElementById('siteName').value = site.name;
    document.getElementById('siteAddress').value = site.address ?? '';
    modal.classList.add('open');
  },
  async toggleArchive(id, isActive) {
    if (!confirm(isActive ? 'Arsipkan pabrik ini?' : 'Aktifkan kembali pabrik ini?')) return;
    try {
      await apiJson(`/sites/${id}/archive`, { method: 'POST' });
      showAlert(isActive ? 'Pabrik berhasil diarsipkan.' : 'Pabrik berhasil diaktifkan kembali.', true);
      location.reload();
    } catch (error) {
      showAlert(error.message || 'Gagal mengubah status pabrik.');
    }
  },
};

document.getElementById('btnAddSite').addEventListener('click', () => {
  editingId = null;
  document.getElementById('modalSiteTitle').textContent = 'Tambah Pabrik';
  form.reset();
  modal.classList.add('open');
});

['btnCloseSite', 'btnCancelSite'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => modal.classList.remove('open'));
});
modal.addEventListener('click', event => {
  if (event.target === modal) modal.classList.remove('open');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  btnSave.disabled = true;
  btnSave.textContent = 'Menyimpan...';
  const payload = {
    name: document.getElementById('siteName').value.trim(),
    address: document.getElementById('siteAddress').value.trim() || null,
  };

  try {
    if (editingId) {
      await apiJson(`/sites/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showAlert('Pabrik berhasil diperbarui.', true);
    } else {
      await apiJson('/sites', { method: 'POST', body: JSON.stringify(payload) });
      showAlert('Pabrik berhasil ditambahkan.', true);
    }
    modal.classList.remove('open');
    location.reload();
  } catch (error) {
    showAlert(error.message || 'Gagal menyimpan pabrik.');
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = 'Simpan';
  }
});
