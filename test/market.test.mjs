import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { importMarket } from '../lib/import-market.mjs';
import { observations, validateMarketSnapshot } from '../lib/market.mjs';
import { presentSnapshot } from '../lib/model.mjs';
import { packSnapshot, unpackSnapshot } from '../lib/snapshot-codec.mjs';
import { marketInput } from './market-fixture.mjs';
const now = Date.parse('2026-10-04T12:00:00Z');
test('market import preserves prices and dates without inventing assessments', () => {
  const input = marketInput(), snapshot = importMarket(input, now), view = presentSnapshot(snapshot, now);
  assert.equal(snapshot.instruments[0].bars.at(-1).close, 170);
  assert.equal(view.instruments[0].sourceDate, '2026-08-09');
  assert.equal(view.source.capturedAt, input.retrievedAt);
  assert.equal(view.coverage.examined, 1); assert.equal(view.coverage.total, 16);
  assert.equal(view.markets[0].value, 170);
  for (const score of view.instruments[0].scores) { assert.equal(score.buy, null); assert.equal(score.sell, null); assert.equal(score.status, 'unassessed'); }
  assert.equal(view.instruments[0].thesis, undefined);
  assert.equal(view.instruments[0].assessments, undefined);
  assert.equal(view.throughDate, presentSnapshot(snapshot, now + 30 * 86400000).throughDate);
});
test('descriptive arithmetic and insufficient history use independent expectations', () => {
  const bars = importMarket(marketInput(), now).instruments[0].bars;
  const obs = observations(bars);
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10);
  near(obs.change1, 100 / 169); near(obs.change5, 500 / 165); near(obs.change20, 2000 / 150);
  near(obs.distance20, (170 / 160.5 - 1) * 100); assert.equal(obs.below63High, 0); assert.equal(obs.volumeRatio, 1);
  const two = observations(bars.slice(0, 2));
  for (const key of ['change5', 'change20', 'distance20', 'below63High', 'volumeRatio']) assert.equal(two[key], null);
  assert.equal(observations(bars.map(b => ({ ...b, volume: 0 }))).volumeRatio, null);
  assert.equal(observations(bars.map(b => ({ ...b, close: 100 }))).change20, 0);
  const split = bars.map(b => ({ ...b, close: b.close / 2 })); near(observations(split).change20, obs.change20);
});
test('input rejects extra fields, unknown symbols, contradictory metadata and bad prices', () => {
  for (const edit of [
    x => { x.balance = 1; }, x => { x.results[0].positions = []; }, x => { x.results[0].bars[0].quantity = 3; },
    x => { x.results[0].symbol = 'UNKNOWN'; }, x => { x.results.push(structuredClone(x.results[0])); },
    x => { x.results[0].interval = 'week'; }, x => { x.bounds = 'extended'; },
    x => { x.results[0].bars[0].session = 'post'; }, x => { x.results[0].bars[0].open_price = ''; },
    x => { x.results[0].bars[0].close_price = 'NaN'; }, x => { x.results[0].bars[0].low_price = '999'; },
    x => { x.results[0].bars[1].begins_at = x.results[0].bars[0].begins_at; },
    x => { x.results[0].bars.reverse(); }, x => { x.results[0].bars[0].begins_at = '2026-02-30T00:00:00Z'; },
    x => { x.retrievedAt = '2026-10-05T00:00:00Z'; }, x => { x.endTime = '2026-10-05T00:00:00Z'; },
  ]) { const input = marketInput(); edit(input); assert.throws(() => importMarket(input, now)); }
});
test('valid gap-fill bars are removed, but cannot mask contradictions or future records', () => {
  const input = marketInput();
  const bar = input.results[0].bars[10];
  Object.assign(bar, { open_price: '100', high_price: '100', low_price: '100', close_price: '100', volume: 0, interpolated: true });
  assert.equal(importMarket(input, now).instruments[0].bars.length, 69);
  for (const edit of [
    b => { b.volume = 1; }, b => { b.low_price = '99'; }, b => { b.begins_at = '2026-10-06T00:00:00Z'; },
    b => { b.close_price = b.open_price = b.high_price = b.low_price = '0'; },
  ]) { const modified = structuredClone(input); edit(modified.results[0].bars[10]); assert.throws(() => importMarket(modified, now)); }
});
test('canonical market schema rejects free prose, grades and competing source authority', () => {
  const snapshot = importMarket(marketInput(), now);
  for (const path of [[], ['source'], ['instruments', 0], ['instruments', 0, 'bars', 0]]) {
    const data = structuredClone(snapshot); let at = data; for (const key of path) at = at[key]; at.privateText = 'anything';
    assert.throws(() => validateMarketSnapshot(data, now), /Unexpected field/);
  }
  const bad = structuredClone(snapshot); bad.instruments[0].scores = [{ buy: 100 }]; assert.throws(() => validateMarketSnapshot(bad, now));
  const price = structuredClone(snapshot); price.source.priceBasis = 'official-close'; assert.throws(() => validateMarketSnapshot(price, now));
});
test('private snapshot package round-trips and bounds malformed or expanded input', () => {
  const snapshot = importMarket(marketInput(), now), encoded = packSnapshot(snapshot, now);
  assert.deepEqual(unpackSnapshot(encoded), snapshot);
  for (const invalid of ['', 'broken?', encoded + '\n', 'a'.repeat(120001), Buffer.from('not gzip').toString('base64'), gzipSync('x'.repeat(2000001)).toString('base64')]) assert.throws(() => unpackSnapshot(invalid));
});

test('measurement windows switch only at the required bar count', () => {
  const bars = importMarket(marketInput(), now).instruments[0].bars;
  for (const [key, threshold] of [['change5', 6], ['change20', 21], ['distance20', 20], ['below63High', 63], ['volumeRatio', 21]]) {
    assert.equal(observations(bars.slice(0, threshold - 1))[key], null);
    assert.equal(typeof observations(bars.slice(0, threshold))[key], 'number');
    assert.equal(typeof observations(bars.slice(0, threshold + 1))[key], 'number');
  }
});

test('series order does not change measurements, and missing series stay absent', () => {
  const input = marketInput(); input.results.push({ ...structuredClone(input.results[0]), symbol: 'QQQ' });
  const a = presentSnapshot(importMarket(input, now), now);
  input.results.reverse(); const b = presentSnapshot(importMarket(input, now), now);
  assert.deepEqual(a, b);
  assert.equal(a.markets.length, 2); assert.equal(a.sectors.length, 0);
  assert.equal(a.coverage.examined, 2);
  assert.equal(a.instruments.some(x => x.symbol === 'NVDA'), false);
});

test('a newer import cannot replace historical bar dates or an unknown series with known data', () => {
  const data = importMarket(marketInput(), now);
  const first = presentSnapshot(data, now);
  data.publishedAt = data.source.capturedAt = '2026-10-04T11:00:00Z';
  const second = presentSnapshot(data, now);
  assert.deepEqual(first.instruments, second.instruments);
  assert.equal(first.throughDate, second.throughDate);
  data.instruments.push({ symbol: 'UNKNOWN', bars: structuredClone(data.instruments[0].bars) });
  assert.throws(() => presentSnapshot(data, now));
});
