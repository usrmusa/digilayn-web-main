import "/scripts/firebase-settings.js";

const element = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const actionCode = params.get('oobCode');
const continueUrl = params.get('continueUrl');
// Capture the code in memory, then remove it from the visible URL and history entry.
window.history.replaceState(null, '', window.location.pathname);
const form = element('password-form');
const actionButton = element('confirm-action');
const errorMessage = element('error');
const password = element('new-password');
const confirmation = element('confirm-password');

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function fail(error) {
  const messages = {
    'auth/expired-action-code': 'This link has expired. Return to your app or website and request a new email.',
    'auth/invalid-action-code': 'This link is invalid or has already been used. Request a new email from your app or website.',
    'auth/user-disabled': 'This account is unavailable. Contact Digilayn for help.',
    'auth/user-not-found': 'This account is unavailable. Contact Digilayn for help.',
    'auth/network-request-failed': 'We couldn’t connect. Check your internet connection and reopen the link in your email.',
    'auth/too-many-requests': 'There have been too many attempts. Please try again later.'
  };
  element('status').hidden = true;
  form.hidden = true;
  actionButton.hidden = true;
  showError(messages[error?.code] || 'We couldn’t complete this request. Reopen your email link and try again, or contact Digilayn.');
}

function complete(title, description) {
  element('page-title').textContent = title;
  element('description').textContent = description;
  element('status').hidden = true;
  form.reset();
  form.hidden = true;
  actionButton.hidden = true;
  errorMessage.hidden = true;
  element('completion').hidden = false;
  // Only explicit trusted websites may be used as return destinations.
  try {
    const url = new URL(continueUrl);
    if (url.protocol === 'https:' && ['digilayn.co.za', 'poortjie.info'].includes(url.hostname) && !url.username && !url.password && !url.port) {
      element('continue-link').href = url.href;
      element('continue-link').textContent = 'Continue to your website';
    }
  } catch { /* The fixed Digilayn home link remains available. */ }
}

async function start() {
  if (!actionCode || !['resetPassword', 'verifyEmail', 'recoverEmail'].includes(mode)) {
    element('status').hidden = true;
    showError('This page needs a valid account link. Open the link in your Digilayn email, or request a new one from your app or website.');
    return;
  }
  try {
    // Use the existing project's pinned SDK version. No analytics on action-code pages.
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    const { getAuth, inMemoryPersistence, setPersistence, verifyPasswordResetCode, confirmPasswordReset, checkActionCode, applyActionCode, validatePassword } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
    const app = initializeApp(window.DIGILAYN_FIREBASE_CONFIG, 'account-actions');
    const auth = getAuth(app);
    await setPersistence(auth, inMemoryPersistence);
    if (mode === 'resetPassword') {
      const email = await verifyPasswordResetCode(auth, actionCode);
      element('page-title').textContent = 'A fresh start. A new password.';
      element('description').textContent = 'Choose a new password to keep your Digilayn account secure.';
      element('account-email').textContent = email;
      element('status').hidden = true;
      form.hidden = false;
      element('show-password').addEventListener('click', () => {
        const visible = password.type === 'password';
        password.type = confirmation.type = visible ? 'text' : 'password';
        element('show-password').textContent = visible ? 'Hide' : 'Show';
        element('show-password').setAttribute('aria-pressed', String(visible));
      });
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.hidden = true;
        if (password.value !== confirmation.value) { showError('Your passwords don’t match. Please enter the same password in both fields.'); return; }
        const button = element('reset-button');
        button.disabled = true;
        button.textContent = 'Saving…';
        try {
          const policy = await validatePassword(auth, password.value);
          if (!policy.isValid) {
            const requirements = [];
            if (policy.meetsMinPasswordLength === false) requirements.push(`at least ${policy.passwordPolicy.customStrengthOptions.minPasswordLength} characters`);
            if (policy.containsLowercaseLetter === false) requirements.push('a lowercase letter');
            if (policy.containsUppercaseLetter === false) requirements.push('an uppercase letter');
            if (policy.containsNumericCharacter === false) requirements.push('a number');
            if (policy.containsNonAlphanumericCharacter === false) requirements.push('a symbol');
            showError(requirements.length ? `Your password needs ${requirements.join(', ')}.` : 'Choose a password that meets your account’s password requirements.');
            return;
          }
          await confirmPasswordReset(auth, actionCode, password.value);
          complete('Your password is updated.', 'Your new password is ready to use across your Digilayn apps and websites.');
        } catch (error) {
          if (['auth/weak-password', 'auth/password-does-not-meet-requirements'].includes(error.code)) showError('Choose a stronger password that meets your account’s password requirements.');
          else if (error.code === 'auth/network-request-failed') showError('We couldn’t connect. Check your connection and try saving again.');
          else fail(error);
        } finally { button.disabled = false; button.textContent = 'Save new password'; }
      });
    } else {
      const info = await checkActionCode(auth, actionCode);
      const expectedOperation = mode === 'verifyEmail' ? 'VERIFY_EMAIL' : 'RECOVER_EMAIL';
      if (info.operation !== expectedOperation) { fail({ code: 'auth/invalid-action-code' }); return; }
      element('page-title').textContent = mode === 'verifyEmail' ? 'Confirm your email.' : 'Restore your email.';
      element('description').textContent = mode === 'verifyEmail' ? 'Confirm that this email address belongs to you.' : 'Undo the email address change on your Digilayn account. If this wasn’t you, reset your password afterwards.';
      element('status').textContent = info.data.email;
      actionButton.textContent = mode === 'verifyEmail' ? 'Verify my email' : 'Restore my email';
      actionButton.hidden = false;
      actionButton.addEventListener('click', async () => {
        actionButton.disabled = true;
        try {
          await applyActionCode(auth, actionCode);
          complete(mode === 'verifyEmail' ? 'Your email is verified.' : 'Your email is restored.', mode === 'verifyEmail' ? 'Thanks for confirming your email address.' : 'The email address change has been undone. If you didn’t make that change, reset your password from your app or website.');
        } catch (error) { fail(error); }
        finally { actionButton.disabled = false; }
      });
    }
  } catch (error) { fail(error); }
}

start();
