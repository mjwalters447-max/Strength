import { gzipSync, gunzipSync } from 'node:zlib';
import { validateSnapshot } from './model.mjs';
const MAX_BYTES = 2000000, MAX_ENCODED = 120000;
export function packSnapshot(data, now = Date.now()) {
  validateSnapshot(data, now);
  if (data.mode === 'demo') throw new Error('Only real sourced snapshots can be packaged.');
  const body = JSON.stringify(data);
  if (Buffer.byteLength(body) > MAX_BYTES) throw new Error('Snapshot too large.');
  const encoded = gzipSync(body).toString('base64');
  if (encoded.length > MAX_ENCODED) throw new Error('Snapshot exceeds private configuration limit.');
  return encoded;
}
export function unpackSnapshot(encoded) {
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > MAX_ENCODED || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error('Invalid packed snapshot.');
  const body = gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: MAX_BYTES });
  return JSON.parse(body.toString('utf8'));
}
