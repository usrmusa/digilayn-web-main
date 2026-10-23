/** Compat SDK adapter for the same admin gate used by the projects portal. */
(function (global) {
  'use strict';
  global.installAdminAccess = function () {
    if (global.AdminAccess) return global.AdminAccess;
    const auth = global.firebase.auth();
    const functions = global.firebase.functions();
    if (!global.DigilaynBuild) throw new Error('Website build target is required.');
    if (global.DigilaynBuild.isLocal) functions.useEmulator('127.0.0.1', 5001);
    const checkAccess = functions.httpsCallable('checkAdminAccess', { timeout: 10000 });
    global.AdminAccess = global.AdminAccessCore.createAdminAccess({
      currentUser: () => auth.currentUser,
      observeAuth: listener => auth.onIdTokenChanged(listener),
      checkAccess: async () => (await checkAccess({})).data
    });
    return global.AdminAccess;
  };
})(window);
