/** Shared project settings for every Digilayn website Firebase entry point.
 * Load as a classic script or import for its side effect from an ES module.
 * Firebase SDK initialization remains owned by each entry point.
 */
(function (global) {
  'use strict';
  global.DIGILAYN_FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyANCpYHeLyWkgVtWL06xpI7XsP08xu9GPA',
    authDomain: 'auth.digilayn.co.za',
    databaseURL: 'https://digilayn-projects-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'digilayn-projects',
    storageBucket: 'digilayn-projects.firebasestorage.app',
    messagingSenderId: '95485356681',
    appId: '1:95485356681:web:3cf619a266961009e17458',
    measurementId: 'G-27H9WZSCGQ'
  });
})(window);
