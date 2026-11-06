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
      const user = global.AdminAccess?.currentUser;
      if (!user) throw new Error('Sign in required.');
      const token = await user.getIdToken();
      if (!global.DigilaynBuild) throw new Error('Website build target is required.');
      if (global.DigilaynBuild.isLocal) {
        if (!isDev) throw new Error('Local application review supports dev only.');
        const review = path.match(/^\/admin\/driver-applications\/([A-Za-z0-9_-]{1,128})\/review$/);
        const pricing = path === '/admin/pricing-configuration';
        if (!review && !pricing) throw new Error('This local fleet API is not configured.');
        const response = await fetch('http://127.0.0.1:5001/' + global.DIGILAYN_FIREBASE_CONFIG.projectId + '/us-central1/' + (pricing ? 'configurePricing' : 'reviewDriverApplication'), {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(pricing ? body : { ...body, applicantUid: review[1] })
        });
        const result = await response.json();
        if (!response.ok || !result.data) throw new Error(result.error?.message || 'Application review failed.');
        return result;
      }
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
      : ['com.digilayn.laynrider', 'com.digilayn.layndriver'])
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
    if (isDev) document.title = 'DEV · ' + document.title;
  });
})(window);
