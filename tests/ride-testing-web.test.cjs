const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../scripts/laynfleet-environment.js'), 'utf8');
function environment(env) {
  const calls = [];
  const window = {
    location: { href: `https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=${env}` },
    AdminAccess: { currentUser: { getIdToken: async () => 'test-token' } },
    DIGILAYN_FIREBASE_CONFIG: { projectId: 'digilayn-projects' }
  };
  const fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ data: { status: 'PENDING', environment: 'dev' } }) }; };
  vm.runInNewContext(source, { URL, window, document: { addEventListener() {} }, fetch });
  return { api: window.LaynFleetEnvironment, calls };
}
test('prod refuses dev ride endpoint before sending any network request', async () => {
  const { api, calls } = environment('prod');
  await assert.rejects(api.request('/admin/dev-ride-state', { environment: 'dev' }), /only in dev/);
  assert.equal(calls.length, 0);
});
test('dev route uses dedicated backend and cannot be redirected to prod by payload', async () => {
  const { api, calls } = environment('dev');
  await api.request('/admin/dev-ride-state', { environment: 'prod', targetStatus: 'PENDING' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://us-central1-digilayn-projects.cloudfunctions.net/editDevRideState');
  assert.equal(JSON.parse(calls[0].options.body).environment, 'dev');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});
test('prod cannot attach ride-testing listener even if caller directly invokes module', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../portfolio/projects/laynfleet/admin/ride-testing.js'), 'utf8'), { window });
  assert.throws(() => window.LaynFleetRideTesting.attach({ environment: { environment: 'prod', isDev: false } }), /only in dev/);
});
