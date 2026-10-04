import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import http from 'node:http';
import { createStrengthServer } from '../server.mjs';
import { demoSnapshot } from '../lib/demo.mjs';

const password = 'Synthetic-test-password-2026!';
async function fixture(options = {}) {
  const origin = 'http://127.0.0.1:4173';
  const server = await createStrengthServer({ password, origin, clock: () => Date.parse('2026-10-04T12:00:00Z'), ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  // Native fetch normalizes Host; use the HTTP boundary to exercise proxy-origin contracts.
  const call = (path, init = {}) => new Promise((resolve, reject) => {
    const req = http.request(base + path, { method: init.method ?? 'GET', headers: { Host: new URL(options.origin ?? origin).host, ...init.headers } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const body = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: { get: name => Array.isArray(res.headers[name]) ? res.headers[name].join(', ') : res.headers[name] ?? null }, text: async () => body, json: async () => JSON.parse(body) }); });
    });
    req.on('error', reject); req.end(init.body);
  });
  const post = (path, body, headers = {}) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: options.origin ?? origin, ...headers }, body: JSON.stringify(body) });
  return { call, post, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

test('password is required and production requires HTTPS', async () => {
  await assert.rejects(createStrengthServer(), /password/i);
  await assert.rejects(createStrengthServer({ password, production: true }), /HTTPS/);
  await assert.rejects(createStrengthServer({ password, origin: 'http://example.com' }), /loopback/);
});
test('unauthenticated user can see only the sign-in page and public assets', async t => {
  const f = await fixture(); t.after(f.close);
  const page = await f.call('/'); assert.match(await page.text(), /login-form/);
  assert.equal((await f.call('/api/snapshot')).status, 401);
  for (const path of ['/server.mjs', '/lib/demo.mjs', '/.env', '/data.json', '/public/index.html', '/api/snapshot/']) assert.ok([401, 404].includes((await f.call(path)).status));
  assert.equal((await f.call('/app.css')).status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('login, protected data, logout, replay and second login work end to end', async t => {
  const f = await fixture(); t.after(f.close);
  assert.equal((await f.post('/api/login', { password: 'wrong' })).status, 401);
  const login = await f.post('/api/login', { password }); assert.equal(login.status, 200);
  const set = login.headers.get('set-cookie'); assert.match(set, /HttpOnly/); assert.match(set, /SameSite=Strict/);
  const cookie = set.split(';')[0];
  const read = await f.call('/api/snapshot', { headers: { Cookie: cookie } });
  assert.equal(read.status, 200); const snapshot = await read.json(); assert.equal(snapshot.mode, 'demo'); assert.equal(snapshot.instruments.length, 6);
  assert.match(await (await f.call('/', { headers: { Cookie: cookie } })).text(), /research-panel/);
  assert.equal((await f.post('/api/logout', {}, { Cookie: cookie })).status, 200);
  assert.equal((await f.call('/api/snapshot', { headers: { Cookie: cookie } })).status, 401);
  const second = await f.post('/api/login', { password }); assert.equal(second.status, 200); assert.notEqual(second.headers.get('set-cookie').split(';')[0], cookie);
});
test('CSRF, wrong Host, unsupported methods and forged cookies fail', async t => {
  const f = await fixture(); t.after(f.close);
  assert.equal((await f.post('/api/login', { password }, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await f.call('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })).status, 403);
  assert.equal((await f.call('/', { headers: { Host: 'attacker.example' } })).status, 400);
  assert.equal((await f.call('/api/snapshot', { headers: { Cookie: 'strength=' + 'a'.repeat(43) } })).status, 401);
  assert.equal((await f.call('/', { method: 'PUT' })).status, 405);
});
test('session expires at the exact boundary and a new login recovers', async t => {
  let now = Date.parse('2026-10-04T12:00:00Z');
  const f = await fixture({ clock: () => now, sessionMs: 1000 }); t.after(f.close);
  const login = await f.post('/api/login', { password }); const cookie = login.headers.get('set-cookie').split(';')[0];
  now += 999; assert.equal((await f.call('/api/snapshot', { headers: { Cookie: cookie } })).status, 200);
  now++; assert.equal((await f.call('/api/snapshot', { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await f.post('/api/login', { password })).status, 200);
});
test('login throttle cannot be bypassed by spoofed forwarding headers and recovers', async t => {
  let now = Date.parse('2026-10-04T12:00:00Z');
  const f = await fixture({ clock: () => now }); t.after(f.close);
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 0; i < 5; i++) assert.equal((await f.post('/api/login', { password: 'wrong' }, { 'X-Forwarded-For': `192.0.2.${i}` })).status, 401);
    assert.equal((await f.post('/api/login', { password })).status, 429);
    now += 15 * 60000;
    assert.equal((await f.post('/api/login', { password })).status, 200);
  }
});
test('production cookie and headers are secure', async t => {
  const f = await fixture({ production: true, origin: 'https://strength.example' }); t.after(f.close);
  const login = await f.post('/api/login', { password });
  assert.match(login.headers.get('set-cookie'), /^__Host-strength=/);
  assert.match(login.headers.get('set-cookie'), /; Secure/);
  assert.match(login.headers.get('strict-transport-security'), /31536000/);
});
test('configured research source loads updates, fails closed, and recovers without demo substitution', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'strength-test-'));
  t.after(async () => {
    const absolute = resolve(dir);
    assert.ok(absolute.startsWith(resolve(tmpdir()) + sep + 'strength-test-'));
    await rm(absolute, { recursive: true });
  });
  const path = join(dir, 'research.json');
  const input = demoSnapshot(); input.mode = 'research'; input.sources[0].usage = 'personal-display';
  await writeFile(path, JSON.stringify(input));
  const f = await fixture({ snapshotPath: path }); t.after(f.close);
  const cookie = (await f.post('/api/login', { password })).headers.get('set-cookie').split(';')[0];
  const get = () => f.call('/api/snapshot', { headers: { Cookie: cookie } });
  assert.equal((await (await get()).json()).mode, 'research');
  input.instruments[0].assessments[0].buy.thesis.level = 0;
  await writeFile(path, JSON.stringify(input));
  assert.equal((await (await get()).json()).instruments[0].scores[0].buy, 61);
  for (const invalid of ['{broken', JSON.stringify({ ...input, balance: 123 }), JSON.stringify({ ...input, mode: 'demo' })]) {
    await writeFile(path, invalid); assert.equal((await get()).status, 503);
    await writeFile(path, JSON.stringify(input)); assert.equal((await get()).status, 200);
  }
});
