const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectsIndexHtml = fs.readFileSync(path.resolve(__dirname, '../portfolio/projects/index.html'), 'utf8');
const globalConfigHtml = fs.readFileSync(path.resolve(__dirname, '../portfolio/projects/global-config.html'), 'utf8');

test('portfolio/projects/index.html replaces Manage Poortjie card with Global Config card', () => {
  assert.ok(!projectsIndexHtml.includes('Manage Poortjie'), 'Manage Poortjie card should be replaced');
  assert.match(projectsIndexHtml, /Global Config/);
  assert.match(projectsIndexHtml, /href="global-config\.html"/);
  assert.match(projectsIndexHtml, /globalConfig\/featureToggles/);
});

test('global-config.html has proper metadata, structure and auth protection', () => {
  assert.match(globalConfigHtml, /<title>Global Configuration \| Digilayn Admin<\/title>/);
  assert.match(globalConfigHtml, /id="initialPageLoader"/);
  assert.match(globalConfigHtml, /id="loginSection"/);
  assert.match(globalConfigHtml, /id="adminPanel"/);
  assert.match(globalConfigHtml, /initAdminAuth/);
});

test('global-config.html binds to globalConfig/featureToggles with boolean accountCreation', () => {
  assert.match(globalConfigHtml, /id="inputToggleAccountCreation"/);
  assert.match(globalConfigHtml, /collection:\s*"globalConfig"/);
  assert.match(globalConfigHtml, /doc:\s*"featureToggles"/);
  assert.match(globalConfigHtml, /accountCreation/);
  assert.match(globalConfigHtml, /id="btnSaveGlobalToggles"/);
  assert.match(globalConfigHtml, /id="btnRevertGlobalToggles"/);
});
