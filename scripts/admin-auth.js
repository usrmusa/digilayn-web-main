import './admin-access-core.js';
import { auth, functions } from './firebase-config.js';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

const checkAccess = httpsCallable(functions, 'checkAdminAccess', { timeout: 10000 });
export const adminAccess = window.AdminAccessCore.createAdminAccess({
  currentUser: () => auth.currentUser,
  observeAuth: listener => onIdTokenChanged(auth, listener),
  checkAccess: async () => (await checkAccess({})).data
});

window.AdminAccess = adminAccess;

export function isVerifiedAdmin(user) {
  return !!user && adminAccess.currentUser?.uid === user.uid && auth.currentUser?.uid === user.uid;
}

export function initAdminAuth(onAuthorized, onUnauthorized, redirectPath = null) {
  return adminAccess.observe((user, error, checking) => {
    if (isVerifiedAdmin(user)) onAuthorized(user);
    else if (redirectPath && !checking && !auth.currentUser && !error) window.location.replace(redirectPath);
    else onUnauthorized(error?.message);
  });
}

export async function loginAdmin(email, password) {
  const credential = await adminAccess.signIn(() => signInWithEmailAndPassword(auth, email.trim(), password));
  return credential.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}
