const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../scripts/laynfleet-environment.js'), 'utf8');

function load(url, overrides = {}) {
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
  const window = { location: { href: url, assign: target => { navigation = target; } }, ...overrides };
  vm.runInNewContext(source, { URL, window, document, fetch: overrides.fetch });
  ready();
  return { config: window.LaynFleetEnvironment, document, select, badge, towing, link, change, navigation: () => navigation };
}

test('production selects explicit prod paths, packages, title and clean badge', () => {
  const page = load('https://digilayn.co.za/portfolio/projects/laynfleet/admin/');
  assert.equal(page.config.environment, 'prod');
  assert.equal(page.config.locationsPath, 'laynfleet/prod/driverLocations');
  assert.equal(page.config.driverStoragePath, 'laynfleet/prod/drivers');
  assert.equal(page.config.driverPackage, 'com.digilayn.layndriver');
  assert.equal(page.config.membershipKey, 'laynFleet');
  assert.equal(page.config.appPackages.length, 2);
  assert.equal(page.document.title, 'LaynFleet');
  assert.equal(page.badge.hidden, true);
});
test('dev controls select dev paths and packages and show DEV', () => {
  const page = load('https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=dev');
  assert.equal(page.config.environment, 'dev');
  assert.equal(page.config.locationsPath, 'laynfleet/dev/driverLocations');
  assert.equal(page.config.driverStoragePath, 'laynfleet/dev/drivers');
  assert.equal(page.config.riderPackage, 'com.digilayn.laynrider.dev');
  assert.equal(page.config.driverPackage, 'com.digilayn.layndriver.dev');
  assert.equal(page.config.membershipKey, 'laynFleetDev');
  assert.equal(page.config.appPackages.length, 2);
  assert.equal(page.badge.hidden, false);
  assert.equal(page.document.title, 'DEV · LaynFleet');
  assert.equal(new URL(page.link.href).searchParams.get('env'), 'dev');
});
test('invalid or duplicate environment cannot silently select production', () => {
  for (const query of ['env=', 'env=main', 'env=DEV', 'env=dev%20', 'env=main&env=dev']) {
    assert.throws(() => load('https://digilayn.co.za/portfolio/projects/users?' + query), /Choose env=prod or env=dev/);
  }
});
test('switching environment reloads the page and preserves unrelated URL state', () => {
  const page = load('https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=prod&view=bookings#pricing');
  page.select.value = 'dev';
  page.change();
  const target = new URL(page.navigation());
  assert.equal(target.searchParams.get('env'), 'dev');
  assert.equal(target.searchParams.get('view'), 'bookings');
  assert.equal(target.hash, '#pricing');
  assert.equal(page.config.environment, 'prod');
});


test('notice publishing routes to the deployed function contract with the selected environment', async () => {
  for (const environment of ['dev', 'prod']) {
    let request;
    const page = load(`https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=${environment}`, {
      AdminAccess: { currentUser: { getIdToken: async () => 'test-token' } },
      DIGILAYN_FIREBASE_CONFIG: { projectId: 'digilayn-projects' },
      fetch: async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ data: { noticeId: 'notice', version: 1 } }) };
      }
    });
    const response = await page.config.request('/admin/dashboard-notices', { environment: 'wrong', noticeId: null, title: 'Update' });
    assert.equal(request.url, 'https://us-central1-digilayn-projects.cloudfunctions.net/saveDashboardNotice');
    assert.equal(JSON.parse(request.options.body).environment, environment);
    assert.equal(request.options.headers.Authorization, 'Bearer test-token');
    assert.equal(response.data.version, 1);
  }
});
test('notice publish fails without identity, project configuration or a confirmed save', async () => {
  let fetches = 0;
  const overrides = {
    AdminAccess: { currentUser: { getIdToken: async () => 'test-token' } },
    DIGILAYN_FIREBASE_CONFIG: { projectId: 'digilayn-projects' },
    fetch: async () => { fetches++; return { ok: false, json: async () => ({ error: { message: 'Notice changed' } }) }; }
  };
  await assert.rejects(load('https://digilayn.co.za/?env=dev').config.request('/admin/dashboard-notices', {}), /Sign in/);
  await assert.rejects(load('https://digilayn.co.za/?env=dev', { ...overrides, DIGILAYN_FIREBASE_CONFIG: undefined }).config.request('/admin/dashboard-notices', {}), /configuration is missing/);
  assert.equal(fetches, 0);
  await assert.rejects(load('https://digilayn.co.za/?env=prod', overrides).config.request('/admin/dashboard-notices', {}), /Notice changed/);
  assert.equal(fetches, 1);
});
