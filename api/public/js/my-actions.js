/**
 * SafetyLog | Tindakan Saya (B-14, B-15).
 */
import { apiJson } from './api.js';
import { requireAccess } from './guard.js';

if (!requireAccess()) {
  throw new Error('Unauthorized');
}

const dialog = document.getElementById('completeActionDialog');
const form = document.getElementById('completeActionForm');
const feedback = document.getElementById('completeFeedback');
let activeActionId = null;

document.querySelectorAll('[data-complete-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeActionId = btn.getAttribute('data-complete-action');
    document.getElementById('completeActionTitle').textContent = btn.getAttribute('data-action-title') || '';
    feedback.hidden = true;
    form.reset();
    dialog.showModal();
  });
});

document.getElementById('btnCloseCompleteDialog')?.addEventListener('click', () => dialog.close());

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeActionId) return;

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/actions/${activeActionId}/complete`, {
      method: 'POST',
      body: new FormData(form),
    });
    dialog.close();
    location.reload();
  } catch (err) {
    feedback.textContent = err.message;
    feedback.hidden = false;
  } finally {
    btn.disabled = false;
  }
});
