const test = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/admin-access-core.js');
const { createAdminAccess } = global.AdminAccessCore;
const approved = { email: 'admin@digilayn.co.za', role: 'admin' };
function setup(checkAccess = async () => approved) {
  let current = null;
  let observe;
  const gate = createAdminAccess({ currentUser: () => current, checkAccess, observeAuth: fn => { observe = fn; } });
  return { gate, set: user => { current = user; }, emit: user => observe(user) };
}
test('sign-in publishes only after the backend approves; no account document needed', async () => {
  const state = setup();
  const user = { uid: 'admin-local', email: 'admin@digilayn.co.za' };
  state.gate.observe(() => {});
  await state.gate.signIn(async () => { state.set(user); state.emit(user); return { user }; });
  assert.equal(state.gate.currentUser, user);
});
test('backend failure and malformed response never publish access', async () => {
  for (const check of [async () => { throw new Error('Unavailable'); }, async () => ({ uid: 'old-contract' })]) {
    const state = setup(check);
    await assert.rejects(state.gate.signIn(async () => { const user = { uid: 'admin' }; state.set(user); return { user }; }));
    assert.equal(state.gate.currentUser, null);
  }
});
test('a failed attempt is not retried until the user signs in again', async () => {
  let attempts = 0;
  const state = setup(async () => { attempts++; throw new Error('Unavailable'); });
  state.gate.observe(() => {});
  const operation = async () => { const user = { uid: 'admin' }; state.set(user); state.emit(user); return { user }; };
  await assert.rejects(state.gate.signIn(operation));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(attempts, 1);
  await assert.rejects(state.gate.signIn(operation));
  assert.equal(attempts, 2);
});
test('account change while verification is pending cannot grant access', async () => {
  let finish;
  const state = setup(() => new Promise(resolve => { finish = resolve; }));
  const operation = state.gate.signIn(async () => { const user = { uid: 'A' }; state.set(user); return { user }; });
  await Promise.resolve();
  state.set({ uid: 'B' });
  finish(approved);
  await assert.rejects(operation, /account changed/);
  assert.equal(state.gate.currentUser, null);
});
test('restored identity is checked with the backend and logout clears access', async () => {
  const state = setup();
  state.gate.observe(() => {});
  const user = { uid: 'admin' };
  state.set(user);
  state.emit(user);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.gate.currentUser, user);
  state.set(null);
  state.emit(null);
  assert.equal(state.gate.currentUser, null);
});
test('signed-out startup makes no backend request', async () => {
  let calls = 0;
  const state = setup(async () => { calls++; return approved; });
  state.gate.observe(() => {});
  state.emit(null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 0);
});
test('restoration reports pending status until authorization finishes', async () => {
  let finish;
  const state = setup(() => new Promise(resolve => { finish = resolve; }));
  const states = [];
  state.gate.observe((user, error, checking) => states.push({ user, error, checking }));
  const user = { uid: 'restored-admin' };
  state.set(user);
  state.emit(user);
  assert.equal(states.at(-1).checking, true);
  assert.equal(states.at(-1).user, null);
  finish(approved);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(states.at(-1).checking, false);
  assert.equal(states.at(-1).user, user);
});
test('token refresh cannot automatically retry a failed admin check', async () => {
  let calls = 0;
  const state = setup(async () => { calls++; throw new Error('Unavailable'); });
  state.gate.observe(() => {});
  const user = { uid: 'admin' };
  state.set(user);
  state.emit(user);
  await new Promise(resolve => setImmediate(resolve));
  state.emit(user);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  await assert.rejects(state.gate.signIn(async () => ({ user })));
  assert.equal(calls, 2);
});
