/** Admin access is granted only by checkAdminAccess, never by profile documents. */
(function (global) {
  'use strict';
  function createAdminAccess(adapter) {
    let verifiedUser = null;
    let lastError = null;
    let checking = true;
    let revision = 0;
    let pending = false;
    let started = false;
    let blockedUid = null;
    const listeners = new Set();
    function publish(user, error = null, inProgress = false) {
      verifiedUser = user;
      lastError = error;
      checking = inProgress;
      for (const listener of listeners) listener(user, error, checking);
    }
    async function verify(user, expected) {
      if (!user) return null;
      const result = await adapter.checkAccess();
      if (expected !== revision || adapter.currentUser()?.uid !== user.uid) return null;
      if (result?.email !== 'admin@digilayn.co.za' || result?.role !== 'admin') {
        throw new Error('Invalid administrator access response.');
      }
      return user;
    }
    async function restore(user) {
      if (user && user.uid === blockedUid) return;
      if (!user) blockedUid = null;
      const expected = ++revision;
      publish(null, null, !!user);
      if (!user) return;
      try {
        const authorized = await verify(user, expected);
        if (authorized) publish(authorized);
      } catch (error) {
        if (expected === revision) {
          blockedUid = user.uid;
          publish(null, error);
        }
      }
    }
    function start() {
      if (started) return;
      started = true;
      adapter.observeAuth(user => {
        if (!pending) void restore(user);
      });
    }
    return {
      get currentUser() { return verifiedUser; },
      observe(listener) {
        listeners.add(listener);
        listener(verifiedUser, lastError, checking);
        start();
        return () => listeners.delete(listener);
      },
      async signIn(operation) {
        if (pending) throw new Error('Sign-in is already in progress.');
        pending = true;
        blockedUid = null;
        const expected = ++revision;
        publish(null, null, true);
        try {
          const credential = await operation();
          if (!credential?.user) throw new Error('Sign-in did not return an account.');
          const user = await verify(credential.user, expected);
          if (!user) throw new Error('Signed-in account changed.');
          publish(user);
          return credential;
        } catch (error) {
          if (expected === revision) {
            blockedUid = adapter.currentUser()?.uid || null;
            publish(null, error);
          }
          throw error;
        } finally {
          pending = false;
          start();
        }
      }
    };
  }
  global.AdminAccessCore = Object.freeze({ createAdminAccess });
})(typeof window !== 'undefined' ? window : globalThis);
