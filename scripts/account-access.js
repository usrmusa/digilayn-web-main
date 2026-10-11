import './account-access-core.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { doc, getDocFromServer, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
const normalize = (snapshot) => ({ exists: snapshot.exists(), data: snapshot.data() || {}, fromCache: snapshot.metadata.fromCache, pendingWrites: snapshot.metadata.hasPendingWrites });
export const accountAccess = window.AccountAccessCore.createAccountAccess({
  currentUser: () => auth.currentUser,
  observeAuth: (listener) => onAuthStateChanged(auth, listener),
  signOut: () => signOut(auth),
  readAccount: async (uid) => normalize(await getDocFromServer(doc(db, 'users', uid))),
  watchAccount: (uid, next, fail) => onSnapshot(doc(db, 'users', uid), { includeMetadataChanges: true }, (snapshot) => next(normalize(snapshot)), fail)
});

window.AccountAccess = accountAccess;
