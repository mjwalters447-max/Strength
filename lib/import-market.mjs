import { object, choice, instant, list, unique, validateBars, fail } from './validation.mjs';
import { UNIVERSE, UNIVERSE_ID, validateMarketSnapshot } from './market.mjs';

// Accept only the typed market-history envelope, never a private review or account export.
export function importMarket(input, now = Date.now()) {
  object(input, ['schemaVersion', 'retrievedAt', 'startTime', 'endTime', 'interval', 'bounds', 'adjustment', 'results'], 'market input');
  if (input.schemaVersion !== 1) fail('Unsupported input schema');
  instant(input.retrievedAt, 'retrievedAt');
  choice(input.interval, ['day'], 'interval'); choice(input.bounds, ['regular'], 'bounds'); choice(input.adjustment, ['split'], 'adjustment');
  list(input.results, 'results', 1, 16); unique(input.results.map(x => x.symbol), 'symbols');
  const instruments = input.results.map(result => {
    object(result, ['symbol', 'bounds', 'interval', 'bars'], 'series');
    choice(result.symbol, UNIVERSE.map(x => x[0]), 'symbol');
    choice(result.bounds, ['regular'], 'bounds'); choice(result.interval, ['day'], 'interval');
    list(result.bars, 'input bars', 2, 500);
    const seen = [];
    const allBars = [];
    const bars = result.bars.flatMap(bar => {
      const keys = ['begins_at', 'open_price', 'high_price', 'low_price', 'close_price', 'volume', 'session'];
      if (Object.hasOwn(bar, 'interpolated')) keys.push('interpolated');
      object(bar, keys, 'input bar'); instant(bar.begins_at, 'daily label');
      if (!bar.begins_at.endsWith('T00:00:00Z')) fail('Unrecognized daily label convention');
      choice(bar.session, ['reg'], 'session');
      if (Object.hasOwn(bar, 'interpolated')) choice(bar.interpolated, [true, false], 'interpolated');
      seen.push(bar.begins_at);
      const numeric = value => {
        if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value)) fail('Invalid source price');
        return Number(value);
      };
      const normalized = { date: bar.begins_at.slice(0, 10), open: numeric(bar.open_price), high: numeric(bar.high_price), low: numeric(bar.low_price), close: numeric(bar.close_price), volume: bar.volume };
      allBars.push(normalized);
      if (bar.interpolated === true) {
        if (bar.volume !== 0 || normalized.open !== normalized.close || normalized.high !== normalized.close || normalized.low !== normalized.close) fail('Contradictory gap-fill bar');
        return [];
      }
      return [normalized];
    });
    unique(seen, 'source daily labels');
    if (seen.some((v, i) => i && v <= seen[i - 1])) fail('Source order is not ascending');
    validateBars(allBars, input.endTime.slice(0, 10));
    for (const bar of allBars) if (bar.date < input.startTime.slice(0, 10) || bar.date >= input.endTime.slice(0, 10)) fail('Source bar outside requested range');
    return { symbol: result.symbol, bars };
  });
  const snapshot = { schemaVersion: 2, mode: 'market', universe: UNIVERSE_ID, publishedAt: input.retrievedAt,
    source: { id: 'connected-daily-history', capturedAt: input.retrievedAt, startTime: input.startTime, endTime: input.endTime, interval: input.interval, bounds: input.bounds, adjustment: input.adjustment, priceBasis: 'bar-last-trade' }, instruments };
  return validateMarketSnapshot(snapshot, now);
}
