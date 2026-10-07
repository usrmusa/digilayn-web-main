const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const window = { location: { href: 'https://digilayn.co.za/portfolio/projects/laynfleet/admin/?env=dev' } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/laynfleet-environment.js'), 'utf8'), {
  window, URL, document: { addEventListener() {} },
});
const select = window.LaynFleetEnvironment.presenceForDriver;

test('legacy driver presence keeps its recorded coordinates', () => {
  const legacy = { online: true, lat: 1, lng: 2 };
  assert.equal(select(legacy), legacy);
});
test('after handover consoles read B coordinates instead of A root writes', () => {
  const deviceB = { online: true, lat: 3, lng: 4 };
  assert.equal(select({ online: false, lat: 99, activeSessionId: 'B', sessions: {
    A: { online: true, lat: 1 }, B: deviceB,
  } }), deviceB);
});
test('A remains irrelevant when it disconnects after handover', () => {
  const deviceB = { online: true, lat: 3, lng: 4 };
  assert.equal(select({ online: false, activeSessionId: 'B', sessions: {
    A: { online: false }, B: deviceB,
  } }).online, true);
});
test('missing or malformed explicit ownership never uses root coordinates', () => {
  for (const owner of ['', null, 123, 'missing']) {
    assert.equal(select({ online: true, lat: 99, activeSessionId: owner, sessions: {} }), undefined);
  }
});
