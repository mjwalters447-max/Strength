import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSnapshot } from '../lib/demo.mjs';
import { validateSnapshot, evaluate, presentSnapshot } from '../lib/model.mjs';

const now = Date.parse('2026-10-04T12:00:00Z');
test('synthetic snapshot is explicit and valid', () => {
  const data = demoSnapshot();
  assert.equal(validateSnapshot(data, now), data);
  assert.equal(data.mode, 'demo');
});
test('independent buy and sell scores have independent arithmetic', () => {
  const item = demoSnapshot().instruments[0];
  for (const value of Object.values(item.assessments[0].buy)) value.level = 4;
  for (const value of Object.values(item.assessments[0].sell)) value.level = 4;
  const result = evaluate(item, 5, now, 'demo');
  assert.equal(result.buy, 100);
  assert.equal(result.sell, 100);
});
test('missing evidence does not turn into zero or reweighted confidence', () => {
  const item = demoSnapshot().instruments[0];
  item.assessments[0].buy.thesis.level = null;
  const result = evaluate(item, 5, now, 'demo');
  assert.equal(result.buy, null);
  assert.equal(result.buyCoverage, 80);
  assert.notEqual(result.sell, null);
});
test('expired research has no current score at the exact validity boundary', () => {
  const item = demoSnapshot().instruments[0];
  const expiry = Date.parse(item.validUntil);
  assert.notEqual(evaluate(item, 5, expiry - 1, 'research').buy, null);
  assert.equal(evaluate(item, 5, expiry, 'research').buy, null);
});
test('veto blocks buy eligibility without fabricating a sell score', () => {
  const item = demoSnapshot().instruments[0];
  const before = evaluate(item, 5, now, 'demo');
  item.assessments[0].vetoes = ['THESIS_FAILURE'];
  const after = evaluate(item, 5, now, 'demo');
  assert.equal(after.buy, null);
  assert.equal(after.sell, before.sell);
  assert.equal(after.status, 'blocked');
});
test('unknown fields at every supported nested level are rejected', () => {
  const paths = [[], ['coverage'], ['sources', 0], ['markets', 0], ['sectors', 0], ['instruments', 0], ['instruments', 0, 'bars', 0], ['instruments', 0, 'thesis'], ['instruments', 0, 'assessments', 0], ['instruments', 0, 'assessments', 0, 'buy'], ['instruments', 0, 'assessments', 0, 'buy', 'thesis'], ['instruments', 0, 'events', 0]];
  for (const path of paths) {
    const data = demoSnapshot();
    let target = data;
    for (const key of path) target = target[key];
    target.privateField = 'forbidden';
    assert.throws(() => validateSnapshot(data, now), /Unexpected field/, path.join('.'));
  }
});
test('rejects invalid bars, conflicting dates, duplicate symbols and unknown sources', () => {
  for (const mutate of [
    d => { d.instruments[0].bars[0].high = 0; },
    d => { d.instruments[0].bars[1].date = d.instruments[0].bars[0].date; },
    d => { d.instruments[1].symbol = d.instruments[0].symbol; },
    d => { d.instruments[0].sourceIds = ['missing']; },
    d => { d.sources[0].url = 'https://example.com/?token=secret'; },
    d => { d.instruments[0].thesis.evidence = 'Email name@example.com'; },
    d => { d.instruments[0].assessments[0].buy.thesis.level = 5; },
  ]) {
    const data = demoSnapshot(); mutate(data);
    assert.throws(() => validateSnapshot(data, now));
  }
});
test('presentation preserves as-of and does not create historical scores', () => {
  const data = demoSnapshot();
  const result = presentSnapshot(data, now);
  assert.equal(result.publishedAt, data.publishedAt);
  assert.equal(result.instruments[0].asOf, data.instruments[0].asOf);
  assert.equal(result.instruments[0].scores.length, 3);
  assert.equal(result.instruments[0].scoreHistory, undefined);
});
test('all 3125 factor combinations per direction agree with independent integer arithmetic', () => {
  const item = demoSnapshot().instruments[0];
  const names = ['thesis', 'structure', 'valuation', 'catalysts', 'execution'];
  const weights = { buy: [25, 25, 20, 15, 15], sell: [35, 25, 15, 15, 10] };
  for (const direction of ['buy', 'sell']) {
    for (let code = 0; code < 3125; code++) {
      let remaining = code, integerTotal = 0;
      for (let i = 0; i < 5; i++) {
        const level = remaining % 5; remaining = Math.floor(remaining / 5);
        item.assessments[0][direction][names[i]].level = level;
        integerTotal += weights[direction][i] * level;
      }
      assert.equal(evaluate(item, 5, now, 'demo')[direction], Math.floor((integerTotal + 2) / 4));
    }
  }
});
test('rejects impossible calendar instants, future evidence and contradictory thesis status', () => {
  for (const mutate of [
    d => { d.sources[0].asOf = '2026-02-30T00:00:00Z'; },
    d => { d.sources[0].asOf = '2026-10-03T20:15:00Z'; },
    d => { d.instruments[0].asOf = '2026-10-03T20:15:00Z'; },
    d => { d.instruments[0].thesis.status = 'INVALIDATED'; },
    d => { d.sources.push({ ...d.sources[0] }); },
    d => { d.instruments[0].previousClose += 1; },
  ]) { const data = demoSnapshot(); mutate(data); assert.throws(() => validateSnapshot(data, now)); }
});
test('unavailable horizons and zero scores remain distinct', () => {
  const item = demoSnapshot().instruments[0];
  item.assessments = item.assessments.filter(x => x.horizon === 5);
  for (const component of Object.values(item.assessments[0].buy)) component.level = 0;
  assert.equal(evaluate(item, 5, now, 'demo').buy, 0);
  assert.equal(evaluate(item, 10, now, 'demo').status, 'unavailable');
  assert.equal(evaluate(item, 10, now, 'demo').buy, null);
});
