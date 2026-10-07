const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../scripts/laynfleet-environment.js'), 'utf8');

function load(url) {
  let ready;
  let change;
  let navigation;
  const badge = { hidden: true };
  const towing = { hidden: false };
  const link = { getAttribute: () => 'tracking#drivers' };
  const select = { addEventListener: (name, handler) => { change = handler; } };
  const document = {
    title: 'LaynFleet',
    addEventListener: (name, handler) => { ready = handler; },
    getElementById: id => id === 'fleet-environment' ? select : null,
    querySelectorAll: query => query.includes('dev-badge') ? [badge] : query.includes('fleet-link') ? [link] : [towing]
  };
  const window = { location: { href: url, assign: target => { navigation = target; } } };
  vm.runInNewContext(source, { URL, window, document });
  ready();
  return { config: window.LaynFleetEnvironment, document, select, badge, towing, link, change, navigation: () => navigation };
}

test('production keeps original paths, packages, title and clean badge', () => {
  const page = load('https://digilayn.co.za/portfolio/projects/laynfleet/admin/');
  assert.equal(page.config.environment, 'main');
  assert.equal(page.config.locationsPath, 'driverLocations');
  assert.equal(page.config.driverStoragePath, 'laynfleet/drivers');
  assert.equal(page.config.driverPackage, 'com.digilayn.layndriver');
  assert.equal(page.config.membershipKey, 'laynFleet');
  assert.equal(page.config.appPackages.length, 3);
  assert.equal(page.document.title, 'LaynFleet');
  assert.equal(page.badge.hidden, true);
});
test('dev controls select dev paths and packages and show DEV', () => {
  const page = load('https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=dev');
  assert.equal(page.config.environment, 'dev');
  assert.equal(page.config.locationsPath, 'driverLocationsDev');
  assert.equal(page.config.driverStoragePath, 'laynfleet/dev/drivers');
  assert.equal(page.config.riderPackage, 'com.digilayn.laynrider.dev');
  assert.equal(page.config.driverPackage, 'com.digilayn.layndriver.dev');
  assert.equal(page.config.membershipKey, 'laynFleetDev');
  assert.equal(page.config.appPackages.length, 2);
  assert.equal(page.badge.hidden, false);
  assert.equal(page.towing.hidden, true);
  assert.equal(page.document.title, 'DEV · LaynFleet');
  assert.equal(new URL(page.link.href).searchParams.get('env'), 'dev');
});
test('invalid or duplicate environment cannot silently select production', () => {
  for (const query of ['env=', 'env=prod', 'env=DEV', 'env=dev%20', 'env=main&env=dev']) {
    assert.throws(() => load('https://digilayn.co.za/portfolio/projects/users?' + query), /Choose env=main or env=dev/);
  }
});
test('switching environment reloads the page and preserves unrelated URL state', () => {
  const page = load('https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=main&view=bookings#pricing');
  page.select.value = 'dev';
  page.change();
  const target = new URL(page.navigation());
  assert.equal(target.searchParams.get('env'), 'dev');
  assert.equal(target.searchParams.get('view'), 'bookings');
  assert.equal(target.hash, '#pricing');
  assert.equal(page.config.environment, 'main');
});
