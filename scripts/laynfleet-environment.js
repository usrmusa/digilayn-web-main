(function (global) {
  'use strict';
  const url = new URL(global.location.href);
  const values = url.searchParams.getAll('env');
  if (values.length > 1 || (values.length === 1 && values[0] !== 'prod' && values[0] !== 'dev')) {
    throw new Error('Choose env=prod or env=dev.');
  }
  const environment = values.length === 0 ? 'prod' : values[0];
  const isDev = environment === 'dev';
  global.LaynFleetEnvironment = Object.freeze({
    environment, isDev,
    async request(path, body) {
      const user = global.firebase.auth().currentUser;
      if (!user) throw new Error('Sign in required.');
      const token = await user.getIdToken();
      const response = await fetch(`https://api.digilayn.co.za/v2/${environment}${path}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error?.message || 'Request failed.');
      return result;
    },
    presenceForDriver(presence) {
      if (!presence) return undefined;
      if (presence.active !== true) return undefined;
      const owner = presence.activeSessionId;
      return typeof owner === 'string' && owner.length > 0 ? presence.sessions?.[owner] : undefined;
    },
    locationsPath: `laynfleet/${environment}/driverLocations`,
    driverStoragePath: `laynfleet/${environment}/drivers`,
    membershipKey: isDev ? 'laynFleetDev' : 'laynFleet',
    riderPackage: isDev ? 'com.digilayn.laynrider.dev' : 'com.digilayn.laynrider',
    driverPackage: isDev ? 'com.digilayn.layndriver.dev' : 'com.digilayn.layndriver',
    appPackages: Object.freeze(isDev
      ? ['com.digilayn.laynrider.dev', 'com.digilayn.layndriver.dev']
      : ['com.digilayn.laynrider', 'com.digilayn.layndriver', 'com.digilayn.laynassist'])
  });
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('fleet-environment');
    if (select) {
      select.value = environment;
      select.addEventListener('change', () => {
        if (select.value !== 'prod' && select.value !== 'dev') throw new Error('Invalid environment');
        const target = new URL(global.location.href);
        target.searchParams.set('env', select.value);
        global.location.assign(target.href);
      });
    }
    document.querySelectorAll('[data-fleet-dev-badge]').forEach((badge) => { badge.hidden = !isDev; });
    document.querySelectorAll('[data-fleet-link]').forEach((link) => {
      const target = new URL(link.getAttribute('href'), global.location.href);
      target.searchParams.set('env', environment);
      link.href = target.href;
    });
    if (isDev) document.querySelectorAll('[data-app="laynassist"]').forEach((button) => { button.hidden = true; });
    if (isDev) document.title = 'DEV · ' + document.title;
  });
})(window);
