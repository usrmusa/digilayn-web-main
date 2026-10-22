const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const target of ['local', 'live']) {
  for (const environment of ['dev', 'prod']) {
    test(`${target} services remain independent of ${environment} fleet data`, () => {
      const output = path.join(root, 'dist', target);
      const window = { location: { href: `http://localhost/?env=${environment}` } };
      const document = { addEventListener() {} };
      const context = vm.createContext({ window, document, URL });
      vm.runInContext(fs.readFileSync(path.join(output, 'scripts/build-target.js'), 'utf8'), context);
      vm.runInContext(fs.readFileSync(path.join(output, 'scripts/laynfleet-environment.js'), 'utf8'), context);
      assert.equal(window.DigilaynBuild.target, target);
      assert.equal(window.DigilaynBuild.isLocal, target === 'local');
      assert.equal(window.LaynFleetEnvironment.environment, environment);
      window.DIGILAYN_FIREBASE_CONFIG = {};
      vm.runInContext(fs.readFileSync(path.join(output, 'portfolio/projects/laynfleet/admin/firebase-config.js'), 'utf8'), context);
      const calls = [];
      const sdk = { useEmulator: (...args) => calls.push(args) };
      window.connectLaynFleetEmulators(sdk, sdk, sdk);
      assert.equal(calls.length, target === 'local' ? 3 : 0);
    });
  }
}
