/**
 * SafetyLog | Detail & Workflow Kasus (B-11..B-17).
 */
import { apiJson } from './api.js';
import { requireAccess } from './guard.js';

if (!requireAccess()) {
  throw new Error('Unauthorized');
}

const rootEl = document.getElementById('caseDetailRoot');
const caseId = rootEl?.dataset.caseId || window.__CASE_ID;
let riskConfigs = window.__RISK_CONFIGS || [];
if (rootEl?.dataset.riskConfigs) {
  try {
    riskConfigs = JSON.parse(rootEl.dataset.riskConfigs);
  } catch (_) {
    riskConfigs = [];
  }
}

function showFeedback(boxId, message, isError = false) {
  const el = document.getElementById(boxId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
  el.hidden = false;
}

// 1. Live risk calculation preview (B-12)
const sevInput = document.getElementById('triageSeverity');
const likInput = document.getElementById('triageLikelihood');
const riskPreview = document.getElementById('triageRiskPreview');
const triageDecision = document.getElementById('triageDecision');
const assessFields = document.getElementById('triageAssessFields');
const rejectFields = document.getElementById('triageRejectFields');
const duplicateFields = document.getElementById('triageDuplicateFields');

function updateRiskPreview() {
  if (!sevInput || !likInput || !riskPreview) return;
  const s = parseInt(sevInput.value || '0', 10);
  const l = parseInt(likInput.value || '0', 10);
  const score = s * l;
  if (!score) {
    riskPreview.textContent = 'Isi keparahan dan kemungkinan untuk melihat skor.';
    return;
  }
  const matched = riskConfigs.find((cfg) => score >= cfg.min_score && score <= cfg.max_score);
  riskPreview.textContent = matched
    ? `Skor ${score} (${matched.label})`
    : `Skor ${score}`;
}

function toggleTriageSections() {
  if (!triageDecision) return;
  const val = triageDecision.value;
  if (assessFields) assessFields.hidden = val !== 'assess';
  if (rejectFields) rejectFields.hidden = val === 'assess';
  if (duplicateFields) duplicateFields.hidden = val !== 'duplicate';
}

sevInput?.addEventListener('input', updateRiskPreview);
likInput?.addEventListener('input', updateRiskPreview);
triageDecision?.addEventListener('change', toggleTriageSections);
updateRiskPreview();
toggleTriageSections();

document.getElementById('triageForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const decision = triageDecision.value;
  const payload = { decision };

  if (decision === 'assess') {
    payload.severity = parseInt(sevInput.value, 10);
    payload.likelihood = parseInt(likInput.value, 10);
    const cat = document.getElementById('triageCategory')?.value;
    const pic = document.getElementById('triagePic')?.value;
    if (cat) payload.category_id = parseInt(cat, 10);
    if (pic) payload.assigned_pic_id = parseInt(pic, 10);
  } else {
    payload.rejection_reason = document.getElementById('triageReason')?.value.trim() || '';
    if (decision === 'duplicate') {
      const dupId = document.getElementById('triageDuplicateId')?.value;
      payload.duplicate_of_case_id = dupId ? parseInt(dupId, 10) : null;
    }
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/cases/${caseId}/triage`, { method: 'POST', body: JSON.stringify(payload) });
    location.reload();
  } catch (err) {
    showFeedback('triageFeedback', err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// 2. Root cause 5 Why & 6M (B-13)
document.getElementById('rootCauseForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const whys = Array.from(form.querySelectorAll('.why-input'))
    .map((input) => input.value.trim())
    .filter((val) => val !== '');

  const payload = {
    root_cause_category: document.getElementById('rootCauseCategory').value,
    five_whys: whys,
    root_cause_summary: document.getElementById('rootCauseSummary').value.trim() || null,
  };

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/cases/${caseId}/root-cause`, { method: 'POST', body: JSON.stringify(payload) });
    location.reload();
  } catch (err) {
    showFeedback('rootCauseFeedback', err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// 3. Add action (B-14)
document.getElementById('addActionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const dueAtRaw = document.getElementById('actionDueAt').value;
  const payload = {
    action_type: document.getElementById('actionType').value,
    title: document.getElementById('actionTitle').value.trim(),
    description: document.getElementById('actionDescription').value.trim() || null,
    pic_user_id: parseInt(document.getElementById('actionPicUserId').value, 10),
    due_at: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
  };

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/cases/${caseId}/actions`, { method: 'POST', body: JSON.stringify(payload) });
    location.reload();
  } catch (err) {
    showFeedback('actionFeedback', err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// 4. Complete action dialog (B-15)
const completeDialog = document.getElementById('completeActionDialog');
const completeForm = document.getElementById('completeActionForm');
let activeActionId = null;

document.querySelectorAll('[data-complete-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeActionId = btn.getAttribute('data-complete-action');
    document.getElementById('completeActionTitle').textContent = btn.getAttribute('data-action-title') || '';
    document.getElementById('completeFeedback').hidden = true;
    completeForm?.reset();
    completeDialog?.showModal();
  });
});

document.getElementById('btnCloseCompleteDialog')?.addEventListener('click', () => completeDialog?.close());

completeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeActionId) return;

  const btn = completeForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/actions/${activeActionId}/complete`, {
      method: 'POST',
      body: new FormData(completeForm),
    });
    completeDialog.close();
    location.reload();
  } catch (err) {
    showFeedback('completeFeedback', err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// 5. Verify case approve/reject (B-16)
const verifyDecision = document.getElementById('verifyDecision');
const verifyApproveFields = document.getElementById('verifyApproveFields');
const verifyRejectFields = document.getElementById('verifyRejectFields');

function toggleVerifyFields() {
  if (!verifyDecision) return;
  const val = verifyDecision.value;
  if (verifyApproveFields) verifyApproveFields.hidden = val !== 'approve';
  if (verifyRejectFields) verifyRejectFields.hidden = val !== 'reject';
}

verifyDecision?.addEventListener('change', toggleVerifyFields);
toggleVerifyFields();

document.getElementById('verifyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const decision = verifyDecision.value;
  const payload = { decision };

  if (decision === 'approve') {
    payload.learning_summary = document.getElementById('learningSummary').value.trim();
  } else {
    payload.rejection_reason = document.getElementById('verifyRejectionReason').value.trim();
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/cases/${caseId}/verify`, { method: 'POST', body: JSON.stringify(payload) });
    location.reload();
  } catch (err) {
    showFeedback('verifyFeedback', err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// 6. Reopen closed case (B-17)
document.getElementById('reopenForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const payload = {
    reason: document.getElementById('reopenReason').value.trim(),
  };

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await apiJson(`/cases/${caseId}/reopen`, { method: 'POST', body: JSON.stringify(payload) });
    location.reload();
  } catch (err) {
    showFeedback('reopenFeedback', err.message, true);
  } finally {
    btn.disabled = false;
  }
});
