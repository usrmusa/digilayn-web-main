(function (global) {
  'use strict';
  const url = new URL(global.location.href);
  const values = url.searchParams.getAll('env');
  if (values.length > 1 || (values.length === 1 && values[0] !== 'main' && values[0] !== 'dev')) {
    throw new Error('Choose env=main or env=dev.');
  }
  const environment = values.length === 0 ? 'main' : values[0];
  const isDev = environment === 'dev';
  global.LaynFleetEnvironment = Object.freeze({
    environment, isDev,
    locationsPath: isDev ? 'driverLocationsDev' : 'driverLocations',
    driverStoragePath: isDev ? 'laynfleet/dev/drivers' : 'laynfleet/drivers',
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
        if (select.value !== 'main' && select.value !== 'dev') throw new Error('Invalid environment');
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
