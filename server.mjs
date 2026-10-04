import http from 'node:http';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { demoSnapshot } from './lib/demo.mjs';
import { presentSnapshot } from './lib/model.mjs';
import { unpackSnapshot } from './lib/snapshot-codec.mjs';

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/icon.svg', ['icon.svg', 'image/svg+xml']],
]);
const digest = token => createHash('sha256').update(token).digest('hex');

export async function createStrengthServer({ password, origin = 'http://127.0.0.1:4173', snapshotPath, snapshotB64, requireSource = false, clock = Date.now, sessionMs = 8 * 3600000, production = false } = {}) {
  const packedConfigured = snapshotB64 !== undefined;
  if (snapshotPath && packedConfigured) throw new Error('Configure exactly one snapshot source.');
  if (requireSource && !snapshotPath && !packedConfigured) throw new Error('A real snapshot source is required.');
  if (typeof password !== 'string' || password.length < 16 || Buffer.byteLength(password) > 1024) throw new Error('Set a unique STRENGTH_PASSWORD of at least 16 characters.');
  const canonical = new URL(origin);
  if (canonical.origin !== origin || canonical.username || canonical.password) throw new Error('STRENGTH_ORIGIN must be an exact origin.');
  if (production && canonical.protocol !== 'https:') throw new Error('Production requires an HTTPS origin and an HTTPS reverse proxy.');
  if (!production && !['127.0.0.1', 'localhost', '[::1]'].includes(canonical.hostname)) throw new Error('Development is loopback only.');
  if (snapshotPath) {
    const candidate = resolve(snapshotPath).toLowerCase();
    if (candidate === root.toLowerCase() || candidate.startsWith(root.toLowerCase() + '\\') || candidate.startsWith(root.toLowerCase() + '/')) throw new Error('Keep research snapshots outside the source directory.');
  }
  const salt = randomBytes(32);
  const passwordKey = await scrypt(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  password = undefined;
  const sessions = new Map();
  const attempts = new Map();
  const globalAttempts = [];
  const cookieName = production ? '__Host-strength' : 'strength';
  const cookie = (token, maxAge) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production ? '; Secure' : ''}`;
  const pages = Object.fromEntries(await Promise.all(['index.html', 'login.html', 'app.css', 'app.js', 'icon.svg'].map(async name => [name, await readFile(resolve(root, 'public', name))])));
  function clean(now) {
    for (const [key, expiry] of sessions) if (expiry <= now) sessions.delete(key);
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    while (globalAttempts.length && globalAttempts[0] <= now - 60000) globalAttempts.shift();
  }
  const server = http.createServer(async (req, res) => {
    const now = clock(); clean(now);
    const headers = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      ...(production ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
    };
    const send = (code, body, type = 'application/json; charset=utf-8', extra = {}) => {
      res.writeHead(code, { ...headers, 'Content-Type': type, ...extra });
      res.end(req.method === 'HEAD' ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    try {
      if (req.headers.host !== canonical.host) return send(400, { error: 'Unrecognized host.' });
      if (req.url.length > 2048) return send(414, { error: 'Request too long.' });
      const url = new URL(req.url, origin);
      if (!['GET', 'HEAD', 'POST'].includes(req.method)) return send(405, { error: 'Method not allowed.' });
      if (req.method === 'POST') {
        if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'Request origin rejected.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'JSON required.' });
        if (Number(req.headers['content-length'] ?? 0) > 2048) return send(413, { error: 'Request too large.' });
      }
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const address = req.socket.remoteAddress;
        const entry = attempts.get(address) ?? { count: 0, until: now + 15 * 60000 };
        if (entry.count >= 5 || globalAttempts.length >= 20 || attempts.size >= 1000) return send(429, { error: 'Too many attempts. Wait before trying again.' }, undefined, { 'Retry-After': '900' });
        entry.count++; attempts.set(address, entry); globalAttempts.push(now);
        let bytes = 0; const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 2048) return send(413, { error: 'Request too large.' });
          chunks.push(chunk);
        }
        let input; try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch { return send(400, { error: 'Invalid request.' }); }
        if (!input || typeof input.password !== 'string' || Object.keys(input).length !== 1 || Buffer.byteLength(input.password) > 1024) return send(400, { error: 'Invalid request.' });
        const key = await scrypt(input.password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
        if (!timingSafeEqual(passwordKey, key)) return send(401, { error: 'That password did not match.' });
        attempts.delete(address);
        if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
        const token = randomBytes(32).toString('base64url'); sessions.set(digest(token), now + sessionMs);
        return send(200, { ok: true }, undefined, { 'Set-Cookie': cookie(token, Math.floor(sessionMs / 1000)) });
      }
      const token = (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) ?? '';
      const authenticated = /^[A-Za-z0-9_-]{43}$/.test(token) && (sessions.get(digest(token)) ?? 0) > now;
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        sessions.delete(digest(token)); return send(200, { ok: true }, undefined, { 'Set-Cookie': cookie('', 0), 'Clear-Site-Data': '"cache"' });
      }
      if (req.method === 'POST') return send(404, { error: 'Not found.' });
      if (url.pathname === '/api/snapshot') {
        if (!authenticated) return send(401, { error: 'Sign in to continue.' });
        let snapshot;
        try {
          if (snapshotPath) {
            if ((await stat(snapshotPath)).size > 2000000) throw new Error('Oversized input');
            snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
          } else if (packedConfigured) snapshot = unpackSnapshot(snapshotB64);
          else snapshot = demoSnapshot();
          if ((snapshotPath || packedConfigured) && !['research', 'market'].includes(snapshot.mode)) throw new Error('Configured source must be real');
          return send(200, presentSnapshot(snapshot, now));
        } catch { return send(503, { error: 'Research is unavailable or failed validation. No replacement data has been substituted.' }); }
      }
      if (url.pathname === '/') return send(200, pages[authenticated ? 'index.html' : 'login.html'], 'text/html; charset=utf-8');
      if (assets.has(url.pathname)) {
        const [name, type] = assets.get(url.pathname); return send(200, pages[name], type);
      }
      return send(404, { error: 'Not found.' });
    } catch { if (!res.headersSent) send(400, { error: 'Unable to process request.' }); else res.end(); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const port = Number(process.env.PORT ?? 4173);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
    const production = process.env.NODE_ENV === 'production';
    const origin = process.env.STRENGTH_ORIGIN ?? `http://127.0.0.1:${port}`;
    const requireSource = process.env.STRENGTH_REQUIRE_SOURCE;
    if (requireSource !== undefined && !['0', '1'].includes(requireSource)) throw new Error('STRENGTH_REQUIRE_SOURCE must be 0 or 1.');
    const server = await createStrengthServer({ password: process.env.STRENGTH_PASSWORD, origin, snapshotPath: process.env.STRENGTH_SNAPSHOT_PATH, snapshotB64: process.env.STRENGTH_SNAPSHOT_B64, requireSource: requireSource === '1', production });
    const host = process.env.STRENGTH_HOST ?? '127.0.0.1';
    if (!production && !['127.0.0.1', '::1'].includes(host)) throw new Error('Development must bind to loopback.');
    server.listen(port, host, () => console.log(`Strength ready at ${origin}. ${process.env.STRENGTH_SNAPSHOT_PATH || process.env.STRENGTH_SNAPSHOT_B64 !== undefined ? 'Dated source configured.' : 'Synthetic demonstration only.'}`));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
