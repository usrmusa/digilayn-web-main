import "./firebase-settings.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

/**
 * Shared Firebase config for the whole Digilayn web (the /portfolio admin area
 * in particular). Project settings live only in firebase-settings.js and are
 * shared with the manager console and account-action page.
 *
 * Web API keys are PUBLIC identifiers — safe to expose. Real access control
 * lives in Firebase/Firestore security rules.
 *
 * Portfolio login and global user-management callables authorize the manager
 * UID on the backend. Direct Firestore operations still depend on rules.
 */
const firebaseConfig = window.DIGILAYN_FIREBASE_CONFIG;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Analytics is optional and must never break auth/data if it is unsupported
// (e.g. blocked, or served from a non-https / file:// context).
let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch((err) => console.warn("Firebase Analytics unavailable:", err));

export { app, analytics, auth, db, functions, storage };
