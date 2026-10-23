/**
 * firebase-config.js — LaynFleet Manager dashboard.
 *
 * Uses the SHARED Digilayn Firebase project (`digilayn-projects`) — the same
 * backend the Android apps (LaynRider / LaynDriver) write to. Web API keys are
 * public identifiers (safe to expose); real access control lives in Firestore
 * security rules. Until those rules are locked down, the manager gate here is
 * enforced client-side by the shared account gate and manager email (dev-grade — see manager.js).
 *
 * Firebase project settings are supplied by /scripts/firebase-settings.js.
 * The dashboard retains its own SDK initialization and manager metadata.
 */
(function (global) {
  'use strict';

  if (!global.DIGILAYN_FIREBASE_CONFIG) {
    throw new Error('Load /scripts/firebase-settings.js before this script.');
  }
  global.LAYNFLEET_FIREBASE_CONFIG = global.DIGILAYN_FIREBASE_CONFIG;

  // Only this account may access the manager dashboard (blueprint: static manager).
  global.MANAGER_EMAIL = 'admin@digilayn.co.za';

  // Firestore layout (must match the Android app — camelCase, app-first).
  if (!global.LaynFleetEnvironment) throw new Error('Load laynfleet-environment.js first.');
  global.FS = {
    users: 'users',
    laynfleet: 'laynfleet',
    laynfleetDoc: global.LaynFleetEnvironment.environment,
    drivers: 'drivers',
    riders: 'riders',
    adminActions: 'adminActions',
    reviews: 'ratings'
  };

  // Provenance strings written by the apps at registration.
  global.APP_PACKAGES = global.LaynFleetEnvironment.appPackages;

  // Helper to connect compat SDK instances to local emulators for a local build.
  global.connectLaynFleetEmulators = function (authInstance, dbInstance, storageInstance) {
    if (!global.DigilaynBuild) throw new Error('Website build target is required.');
    if (global.DigilaynBuild.isLocal) {
        if (authInstance && typeof authInstance.useEmulator === 'function') {
          authInstance.useEmulator('http://127.0.0.1:9099');
        }
        if (dbInstance && typeof dbInstance.useEmulator === 'function') {
          dbInstance.useEmulator('127.0.0.1', 8080);
        }
        if (storageInstance && typeof storageInstance.useEmulator === 'function') {
          storageInstance.useEmulator('127.0.0.1', 9199);
        }
    }
  };
})(window);
