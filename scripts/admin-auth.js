import { accountAccess } from './account-access.js';
import { auth, functions } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

// The backend owns the UID allowlist; this state controls presentation only.
const verifyAccess = httpsCallable(functions, 'verifyAdminAccessCallable');
let verifiedAdminUid = null;
let declining = false;

export function isVerifiedAdmin(user) {
  return !!user && user.uid === verifiedAdminUid && auth.currentUser?.uid === user.uid;
}

async function declineAccess() {
  declining = true;
  verifiedAdminUid = null;
  try { await signOut(auth); }
  finally { window.location.replace('https://digilayn.co.za/'); }
}

async function verifyAdmin(user) {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    verifiedAdminUid = user.uid;
    return true;
  }
  try {
    const { data } = await verifyAccess({});
    if (auth.currentUser?.uid !== user.uid || data.uid !== user.uid) return false;
    verifiedAdminUid = data.uid;
    return true;
  } catch (error) {
    if (auth.currentUser?.uid !== user.uid) return false;
    verifiedAdminUid = null;
    if (error.code === 'functions/permission-denied' || error.code === 'functions/unauthenticated') {
      await declineAccess();
      return false;
    }
    throw error;
  }
}

export function initAdminAuth(onAuthorized, onUnauthorized, redirectPath = null) {
  let stopAccountObserver = null;
  let generation = 0;
  return onAuthStateChanged(auth, async (user) => {
    const currentGeneration = ++generation;
    stopAccountObserver?.();
    stopAccountObserver = null;
    verifiedAdminUid = null;
    if (declining) return;
    if (!user) {
      if (redirectPath) window.location.replace(redirectPath);
      else onUnauthorized();
      return;
    }
    onUnauthorized();
    try {
      if (!await verifyAdmin(user) || currentGeneration !== generation) return;
      stopAccountObserver = accountAccess.observe((verifiedUser) => {
        if (currentGeneration !== generation || declining) return;
        if (isVerifiedAdmin(verifiedUser)) onAuthorized(verifiedUser);
        else onUnauthorized();
      });
    } catch (error) {
      if (currentGeneration === generation && !declining) onUnauthorized(error.message);
    }
  });
}

export async function loginAdmin(email, password) {
  const credential = await accountAccess.signIn(async () => {
    const result = await signInWithEmailAndPassword(auth, (email || '').trim(), password);
    if (!await verifyAdmin(result.user)) return null;
    return result;
  });
  return credential?.user || null;
}

export async function logoutAdmin() {
  verifiedAdminUid = null;
  await signOut(auth);
}
