(function () {
    'use strict';

    firebase.initializeApp(window.DIGILAYN_FIREBASE_CONFIG);
    const auth = firebase.auth();
    window.installAccountAccess();
    const functions = firebase.app().functions('us-central1');

    const getMyData = functions.httpsCallable('getMyLaynRiderDataCallable');
    const deleteMyAccount = functions.httpsCallable('deleteMyLaynRiderAccountCallable');

    const byId = (id) => document.getElementById(id);
    const loginCard = byId('login-card');
    const accountCard = byId('account-card');
    const deleteCard = byId('delete-card');
    const confirmation = byId('delete-confirmation');
    const understood = byId('understand-checkbox');
    const deleteButton = byId('delete-button');

    function setStatus(id, message, kind) {
        const element = byId(id);
        if (!element) return;
        element.textContent = message || '';
        element.className = `status ${kind || ''}`;
    }

    function messageFor(error) {
        const message = error && error.message ? error.message : 'Something went wrong. Please try again.';
        return message.replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)\.?$/, '');
    }

    async function loadData() {
        setStatus('data-status', 'Loading your data…');
        const progressEl = byId('data-loading-progress');
        if (progressEl) progressEl.classList.remove('hidden');
        const refreshBtn = byId('refresh-button');
        if (refreshBtn) refreshBtn.disabled = true;
        try {
            const result = await getMyData({});
            if (result.data?.isProtected || result.data?.protected) {
                if (deleteCard) deleteCard.classList.add('hidden');
                if (deleteButton) deleteButton.disabled = true;
                setStatus('data-status', 'This account is a protected system account and cannot be deleted.', 'error');
                byId('data-output').textContent = JSON.stringify(result.data, null, 2);
                return;
            }
            byId('data-output').textContent = JSON.stringify(result.data, null, 2);
            setStatus('data-status', 'Your current account data is shown below.', 'success');
        } catch (error) {
            const message = messageFor(error);
            const isNotFound = /not found|no laynrider/i.test(message) ||
                (error && (error.code === 'not-found' || error.code === 'functions/not-found'));
            if (isNotFound) {
                await auth.signOut();
                setStatus('login-status', 'No LaynRider profile found for this account. There is no account or data to delete.', 'error');
                return;
            }
            setStatus('data-status', message, 'error');
            byId('data-output').textContent = 'Unable to load account data.';
        } finally {
            if (progressEl) progressEl.classList.add('hidden');
            if (refreshBtn) refreshBtn.disabled = false;
        }
    }

    function isConfirmationValid() {
        const email = (AccountAccess.currentUser && AccountAccess.currentUser.email || '').trim().toLowerCase();
        const val = confirmation.value.trim().toLowerCase();
        return email ? val === email : val === 'delete';
    }

    function updateDeleteButton() {
        if (deleteButton) {
            deleteButton.disabled = !understood.checked || !isConfirmationValid();
        }
    }

    const emailForm = byId('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setStatus('login-status', 'Signing in…');
            try {
                await AccountAccess.signIn(() => auth.signInWithEmailAndPassword(byId('email').value.trim(), byId('password').value));
            } catch (error) {
                setStatus('login-status', messageFor(error), 'error');
            }
        });
    }

    const googleBtn = byId('google-button');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            setStatus('login-status', 'Opening Google sign-in…');
            try {
                await AccountAccess.signIn(() => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()));
            } catch (error) {
                setStatus('login-status', messageFor(error), 'error');
            }
        });
    }

    const refreshBtn = byId('refresh-button');
    if (refreshBtn) refreshBtn.addEventListener('click', loadData);

    const signoutBtn = byId('signout-button');
    if (signoutBtn) signoutBtn.addEventListener('click', () => auth.signOut());

    if (understood) understood.addEventListener('change', updateDeleteButton);
    if (confirmation) confirmation.addEventListener('input', updateDeleteButton);

    if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
            if (!understood.checked || !isConfirmationValid()) return;
            deleteButton.disabled = true;
            setStatus('delete-status', 'Deleting your account and data… Do not close this page.');
            const val = confirmation.value.trim();
            try {
                try {
                    await deleteMyAccount({ confirmation: val });
                } catch (err) {
                    if (/Type DELETE/i.test(err && err.message || '')) {
                        await deleteMyAccount({ confirmation: 'DELETE' });
                    } else {
                        throw err;
                    }
                }
                accountCard.classList.add('hidden');
                deleteCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
                if (byId('email-form')) byId('email-form').classList.add('hidden');
                setStatus('login-status', 'Your LaynRider account and associated data were permanently deleted.', 'success');
            } catch (error) {
                setStatus('delete-status', messageFor(error), 'error');
                updateDeleteButton();
            }
        });
    }

    AccountAccess.observe((user) => {
        if (loginCard) loginCard.classList.toggle('hidden', Boolean(user));
        if (accountCard) accountCard.classList.toggle('hidden', !user);
        if (deleteCard) deleteCard.classList.toggle('hidden', !user);
        if (!user) return;
        byId('identity').textContent = `${user.displayName || 'LaynRider user'} · ${user.email || user.uid}`;
        if (user.email && confirmation) {
            confirmation.placeholder = user.email;
        }
        if (confirmation) confirmation.value = '';
        if (understood) understood.checked = false;
        updateDeleteButton();
        loadData();
    });
})();
