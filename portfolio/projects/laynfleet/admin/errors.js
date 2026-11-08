/**
 * errors.js — LaynFleet Client Errors & Telemetry controller.
 *
 * Embedded as an in-page section of the manager console (index.html).
 * It does NOT initialize Firebase, the auth gate, or the login form — the host
 * (manager.js) owns the single Firebase app, single auth session, and shell.
 *
 * Exposes window.LaynFleetErrors:
 *   attach(db, fleetEnv) — start the live clientErrors stream + wire interactions.
 *   detach()             — stop the stream and remove this section's listeners.
 *
 * Streams client errors from Firestore:
 *   Dev:  laynfleet/dev/clientErrors
 *   Prod: laynfleet/prod/clientErrors
 *
 * All DOM ids used here are namespaced `err-*` to avoid colliding with the
 * host console's elements.
 */
(function (global) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const show = (el) => el && el.classList.remove('is-hidden');
  const hide = (el) => el && el.classList.add('is-hidden');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts) : (ts instanceof Date ? ts : null));
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function relativeTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts) : (ts instanceof Date ? ts : null));
    if (!d || isNaN(d.getTime())) return '';
    const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // State
  let fleetEnv = null;
  let allErrors = [];
  let activeAppFilter = 'all';
  let searchQuery = '';
  let unsubErrors = null;
  let selectedError = null;
  let interactionsWired = false;

  function updateKpis() {
    const total = allErrors.length;
    const rider = allErrors.filter((e) => e.app === 'laynrider').length;
    const driver = allErrors.filter((e) => e.app === 'layndriver').length;
    const anon = allErrors.filter((e) => !e.uid).length;

    if ($('err-stat-total')) $('err-stat-total').textContent = total;
    if ($('err-stat-rider')) $('err-stat-rider').textContent = rider;
    if ($('err-stat-driver')) $('err-stat-driver').textContent = driver;
    if ($('err-stat-anon')) $('err-stat-anon').textContent = anon;
    if ($('nav-badge-errors')) {
      $('nav-badge-errors').textContent = total;
      $('nav-badge-errors').classList.toggle('is-hidden', total === 0);
    }
    if ($('err-stat-env-label') && fleetEnv) $('err-stat-env-label').textContent = `Environment: ${fleetEnv.environment}`;
  }

  function getFilteredErrors() {
    return allErrors.filter((item) => {
      if (activeAppFilter !== 'all' && item.app !== activeAppFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const text = [item.message, item.errorType, item.deviceId, item.deviceModel, item.uid, item.app]
          .filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }

  function renderErrors() {
    const container = $('err-container');
    if (!container) return;

    const filtered = getFilteredErrors();
    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:48px 16px; background:var(--digilayn-surface-container); border-radius:var(--radius); border:1px dashed var(--digilayn-outline-variant);">
          <span style="font-size:32px; display:block; margin-bottom:12px;">✅</span>
          <p style="font-size:16px; font-weight:700; color:var(--digilayn-on-surface); margin-bottom:4px;">No client errors recorded</p>
          <p style="font-size:13px; color:var(--digilayn-on-surface-variant);">No client crashes or startup failures matching the current criteria in ${escapeHtml(fleetEnv ? fleetEnv.environment : '')}.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map((err) => {
      const appBadgeClass = err.app === 'layndriver' ? 'badge-driver' : 'badge-rider';
      const appName = err.app === 'layndriver' ? 'LaynDriver' : 'LaynRider';
      const uidDisplay = err.uid ? `UID: ${escapeHtml(err.uid)}` : 'Anonymous / Startup';
      const uidBadgeClass = err.uid ? '' : 'badge-anon';
      const timeStr = formatDate(err.createdAt);
      const relTime = relativeTime(err.createdAt);

      return `
        <div class="error-card" data-error-id="${escapeHtml(err.id)}">
          <div class="error-header">
            <span class="badge ${appBadgeClass}">${escapeHtml(appName)}</span>
            <span class="badge badge-type">${escapeHtml(err.errorType || 'Error')}</span>
            <span class="badge ${uidBadgeClass}">${escapeHtml(uidDisplay)}</span>
            <span class="error-time">${escapeHtml(timeStr)} (${escapeHtml(relTime)})</span>
          </div>
          <div class="error-message">${escapeHtml(err.message || 'No error message provided')}</div>
          <div class="error-meta-grid">
            <div class="error-meta-item">Device: <strong>${escapeHtml(err.deviceModel || 'Unknown')}</strong></div>
            <div class="error-meta-item">OS: <strong>${escapeHtml(err.osVersion || 'Unknown')}</strong></div>
            <div class="error-meta-item">App Version: <strong>v${escapeHtml(err.appVersion || '1')}</strong></div>
            <div class="error-meta-item">Device ID: <strong>${escapeHtml(err.deviceId || 'unknown')}</strong></div>
            <div class="error-meta-item">Doc ID: <strong>${escapeHtml(err.id)}</strong></div>
          </div>
        </div>`;
    }).join('');
  }

  function openModal(err) {
    const modal = $('err-modal');
    if (!modal) return;
    $('err-modal-title').textContent = `${err.app === 'layndriver' ? 'LaynDriver' : 'LaynRider'} — ${err.errorType || 'Error'}`;
    $('err-modal-json').textContent = JSON.stringify(err, null, 2);
    show(modal);
  }

  function closeModal() {
    hide($('err-modal'));
    selectedError = null;
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  // Wire one-time interactions scoped to this section's elements.
  function wireInteractions() {
    if (interactionsWired) return;
    interactionsWired = true;

    document.querySelectorAll('[data-err-app-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-err-app-filter]').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        activeAppFilter = chip.getAttribute('data-err-app-filter');
        renderErrors();
      });
    });

    const searchInput = $('err-search-input');
    if (searchInput) searchInput.addEventListener('input', () => { searchQuery = searchInput.value.trim(); renderErrors(); });

    const container = $('err-container');
    if (container) container.addEventListener('click', (e) => {
      const card = e.target.closest('.error-card');
      if (!card) return;
      selectedError = allErrors.find((item) => item.id === card.getAttribute('data-error-id'));
      if (selectedError) openModal(selectedError);
    });

    const modalCloseBtn = $('err-modal-close-btn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    const modalDismissBtn = $('err-modal-dismiss-btn');
    if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeModal);

    const errorModal = $('err-modal');
    if (errorModal) errorModal.addEventListener('click', (e) => { if (e.target === errorModal) closeModal(); });

    const modalCopyBtn = $('err-modal-copy-btn');
    if (modalCopyBtn) modalCopyBtn.addEventListener('click', () => {
      if (!selectedError) return;
      const json = JSON.stringify(selectedError, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          modalCopyBtn.textContent = 'Copied!';
          setTimeout(() => { modalCopyBtn.textContent = 'Copy JSON'; }, 1500);
        });
      }
    });

    document.addEventListener('keydown', onKeydown);
  }

  function attach(db, env) {
    if (!db || !env) throw new Error('LaynFleetErrors.attach requires (db, fleetEnv).');
    fleetEnv = env;
    wireInteractions();
    updateKpis();

    const errorsCol = db.collection('laynfleet').doc(fleetEnv.environment).collection('clientErrors');
    if (unsubErrors) { unsubErrors(); unsubErrors = null; }
    unsubErrors = errorsCol.orderBy('createdAt', 'desc').limit(150).onSnapshot((snapshot) => {
      allErrors = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      updateKpis();
      renderErrors();
    }, (error) => {
      console.warn('Firestore clientErrors listener failure:', error);
      const container = $('err-container');
      if (container) container.innerHTML = `<div class="empty-state"><p style="color:var(--digilayn-error);">Failed to load errors: ${escapeHtml(error.message)}</p></div>`;
    });

    return detach;
  }

  function detach() {
    if (unsubErrors) { unsubErrors(); unsubErrors = null; }
    closeModal();
  }

  global.LaynFleetErrors = { attach, detach };
})(window);
