/**
 * errors.js — LaynFleet Client Errors & Telemetry Console.
 *
 * Streams client errors from Firestore:
 *   Dev:  laynfleet/dev/clientErrors
 *   Prod: laynfleet/prod/clientErrors
 */
(function () {
  'use strict';

  const fleetEnv = window.LaynFleetEnvironment;
  if (!fleetEnv) throw new Error("Fleet environment is required");

  // Initialize Firebase using shared configuration
  if (!firebase.apps.length) {
    firebase.initializeApp(window.LAYNFLEET_FIREBASE_CONFIG);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();
  if (typeof window.connectLaynFleetEmulators === 'function') {
    window.connectLaynFleetEmulators(auth, db);
  }
  if (typeof window.installAccountAccess === 'function') {
    window.installAccountAccess();
  }

  const errorsCol = db.collection('laynfleet').doc(fleetEnv.environment).collection('clientErrors');

  // DOM Helpers
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
  let allErrors = [];
  let activeAppFilter = 'all';
  let searchQuery = '';
  let unsubErrors = null;
  let selectedError = null;

  // ---------------------------------------------------------------------------
  // AUTH GATING
  // ---------------------------------------------------------------------------
  if (window.AccountAccess && typeof window.AccountAccess.observe === 'function') {
    AccountAccess.observe(async (user) => {
      hide($('boot-view'));
      if (!user) return showLogin();

      if ((user.email || '').toLowerCase() !== String(window.MANAGER_EMAIL).toLowerCase()) {
        await auth.signOut();
        showLogin('This account is not authorised for the manager console.');
        return;
      }
      showApp(user);
    });
  } else {
    auth.onAuthStateChanged((user) => {
      hide($('boot-view'));
      if (user) {
        showApp(user);
      } else {
        showLogin();
      }
    });
  }

  function showLogin(errorMsg) {
    detachListeners();
    hide($('app-view'));
    show($('login-view'));
    const err = $('login-error');
    if (errorMsg) { err.textContent = errorMsg; show(err); } else { hide(err); }
  }

  function showApp(user) {
    hide($('login-view'));
    show($('app-view'));
    if ($('sidebar-email')) $('sidebar-email').textContent = user?.email || 'dev-manager';
    if ($('sidebar-avatar')) $('sidebar-avatar').textContent = (user?.displayName || user?.email || 'M').charAt(0).toUpperCase();
    if ($('stat-env-label')) $('stat-env-label').textContent = `Environment: ${fleetEnv.environment}`;
    attachListeners();
  }

  // Login Form
  const loginForm = $('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('login-email').value.trim();
      const password = $('login-password').value;
      const btn = $('login-submit');
      hide($('login-error'));

      if (email.toLowerCase() !== String(window.MANAGER_EMAIL).toLowerCase()) {
        const err = $('login-error');
        err.textContent = 'This account is not authorised for the manager console.';
        show(err);
        return;
      }

      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        if (window.AccountAccess && typeof window.AccountAccess.signIn === 'function') {
          await AccountAccess.signIn(() => auth.signInWithEmailAndPassword(email, password));
        } else {
          await auth.signInWithEmailAndPassword(email, password);
        }
      } catch (err) {
        console.error(err);
        const el = $('login-error');
        el.textContent = err.message || 'Could not sign in.';
        show(el);
      } finally {
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    });
  }

  const logoutBtn = $('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => auth.signOut());

  // ---------------------------------------------------------------------------
  // DATA STREAMING
  // ---------------------------------------------------------------------------
  function attachListeners() {
    detachListeners();
    unsubErrors = errorsCol.orderBy('createdAt', 'desc').limit(150).onSnapshot((snapshot) => {
      allErrors = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      updateKpis();
      renderErrors();
    }, (error) => {
      console.warn('Firestore clientErrors listener failure:', error);
      const container = $('errors-container');
      if (container) {
        container.innerHTML = `<div class="empty-state"><p style="color:var(--digilayn-error);">Failed to load errors: ${escapeHtml(error.message)}</p></div>`;
      }
    });
  }

  function detachListeners() {
    if (unsubErrors) {
      unsubErrors();
      unsubErrors = null;
    }
  }

  // ---------------------------------------------------------------------------
  // RENDERING & METRICS
  // ---------------------------------------------------------------------------
  function updateKpis() {
    const total = allErrors.length;
    const rider = allErrors.filter(e => e.app === 'laynrider').length;
    const driver = allErrors.filter(e => e.app === 'layndriver').length;
    const anon = allErrors.filter(e => !e.uid).length;

    if ($('stat-total')) $('stat-total').textContent = total;
    if ($('stat-rider')) $('stat-rider').textContent = rider;
    if ($('stat-driver')) $('stat-driver').textContent = driver;
    if ($('stat-anon')) $('stat-anon').textContent = anon;
    if ($('nav-badge-errors')) $('nav-badge-errors').textContent = total;
  }

  function getFilteredErrors() {
    return allErrors.filter((item) => {
      if (activeAppFilter !== 'all' && item.app !== activeAppFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const text = [
          item.message,
          item.errorType,
          item.deviceId,
          item.deviceModel,
          item.uid,
          item.app
        ].filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }

  function renderErrors() {
    const container = $('errors-container');
    if (!container) return;

    const filtered = getFilteredErrors();
    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:48px 16px; background:var(--digilayn-surface-container); border-radius:var(--radius); border:1px dashed var(--digilayn-outline-variant);">
          <span style="font-size:32px; display:block; margin-bottom:12px;">✅</span>
          <p style="font-size:16px; font-weight:700; color:var(--digilayn-on-surface); margin-bottom:4px;">No client errors recorded</p>
          <p style="font-size:13px; color:var(--digilayn-on-surface-variant);">No client crashes or startup failures matching the current criteria in ${escapeHtml(fleetEnv.environment)}.</p>
        </div>
      `;
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
        </div>
      `;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // INTERACTIONS & MODAL
  // ---------------------------------------------------------------------------
  // App Filters
  document.querySelectorAll('[data-app-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-app-filter]').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      activeAppFilter = chip.getAttribute('data-app-filter');
      renderErrors();
    });
  });

  // Search Input
  const searchInput = $('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderErrors();
    });
  }

  // Error Card Click -> Open Detail Modal
  const errorsContainer = $('errors-container');
  if (errorsContainer) {
    errorsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.error-card');
      if (!card) return;
      const errorId = card.getAttribute('data-error-id');
      selectedError = allErrors.find(item => item.id === errorId);
      if (selectedError) {
        openModal(selectedError);
      }
    });
  }

  function openModal(err) {
    const modal = $('error-modal');
    if (!modal) return;
    $('modal-error-title').textContent = `${err.app === 'layndriver' ? 'LaynDriver' : 'LaynRider'} — ${err.errorType || 'Error'}`;
    $('modal-json').textContent = JSON.stringify(err, null, 2);
    show(modal);
  }

  function closeModal() {
    hide($('error-modal'));
    selectedError = null;
  }

  const modalCloseBtn = $('modal-close-btn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  const modalDismissBtn = $('modal-dismiss-btn');
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeModal);

  const errorModal = $('error-modal');
  if (errorModal) {
    errorModal.addEventListener('click', (e) => {
      if (e.target === errorModal) closeModal();
    });
  }

  // Copy JSON Button
  const modalCopyBtn = $('modal-copy-btn');
  if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', () => {
      if (!selectedError) return;
      const json = JSON.stringify(selectedError, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          modalCopyBtn.textContent = 'Copied!';
          setTimeout(() => { modalCopyBtn.textContent = 'Copy JSON'; }, 1500);
        });
      }
    });
  }

  // ESC closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

})();
