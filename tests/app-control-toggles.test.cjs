const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlSource = fs.readFileSync(path.resolve(__dirname, '../portfolio/projects/laynfleet/admin/index.html'), 'utf8');
const jsSource = fs.readFileSync(path.resolve(__dirname, '../portfolio/projects/laynfleet/admin/manager.js'), 'utf8');

// Extract validAppConfig function from manager.js for direct unit testing
function extractValidAppConfig() {
  const match = jsSource.match(/function validAppConfig\(config\) \{([\s\S]*?)\n  \}/);
  assert.ok(match, 'validAppConfig function should be present in manager.js');
  return new Function('config', match[1]);
}

const validAppConfig = extractValidAppConfig();

test('validAppConfig accepts valid configurations with and without accountCreationEnabled', () => {
  const baseConfig = {
    maintenanceMode: false,
    maintenanceMessage: 'Operational',
    minVersionCode: 1,
    storeUrl: 'https://example.com'
  };

  // Valid without optional fields
  assert.equal(validAppConfig(baseConfig), true);

  // Valid with boolean accountCreationEnabled
  assert.equal(validAppConfig({ ...baseConfig, accountCreationEnabled: true }), true);
  assert.equal(validAppConfig({ ...baseConfig, accountCreationEnabled: false }), true);

  // Valid with both accountCreationEnabled and driverLicenceRequired
  assert.equal(validAppConfig({ ...baseConfig, accountCreationEnabled: true, driverLicenceRequired: true }), true);
  assert.equal(validAppConfig({ ...baseConfig, accountCreationEnabled: false, driverLicenceRequired: false }), true);
});

test('validAppConfig rejects invalid accountCreationEnabled types (strict no-fallback)', () => {
  const baseConfig = {
    maintenanceMode: false,
    maintenanceMessage: 'Operational',
    minVersionCode: 1,
    storeUrl: 'https://example.com'
  };

  for (const badValue of ['true', 'false', 1, 0, null, {}, []]) {
    assert.equal(validAppConfig({ ...baseConfig, accountCreationEnabled: badValue }), false);
  }
});

test('index.html provides Feature Toggles tab and dedicated controls panel', () => {
  // Check tab in #appcontrol-tabs
  assert.match(htmlSource, /<button class="tab" data-app-tab="toggles">Feature Toggles<\/button>/);

  // Check panel exists
  assert.match(htmlSource, /id="appcontrol-toggles-panel"/);

  // Check required toggle inputs
  assert.match(htmlSource, /id="input-toggle-rider-account-creation"/);
  assert.match(htmlSource, /id="input-toggle-driver-account-creation"/);
  assert.match(htmlSource, /id="input-toggle-driver-licence"/);

  // Check action buttons
  assert.match(htmlSource, /id="btn-save-feature-toggles"/);
  assert.match(htmlSource, /id="btn-revert-feature-toggles"/);
});

test('manager.js wires feature toggles tab, state updater, and save handler', () => {
  assert.match(jsSource, /pkg === 'toggles'/);
  assert.match(jsSource, /function updateFeatureTogglesFromState\(\)/);
  assert.match(jsSource, /async function saveFeatureToggles\(\)/);
  assert.match(jsSource, /btnSaveToggles\.addEventListener\('click', saveFeatureToggles\)/);
  assert.match(jsSource, /btnRevertToggles\.addEventListener\('click', updateFeatureTogglesFromState\)/);
});
