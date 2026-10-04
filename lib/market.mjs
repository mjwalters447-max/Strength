import { object, choice, instant, list, unique, validateBars, fail } from './validation.mjs';

// An editorial reference universe, independent of any user's positions or reviews.
export const UNIVERSE = Object.freeze([
  ['SPY', 'S&P 500 ETF', 'Broad market', 'etf'], ['QQQ', 'Nasdaq-100 ETF', 'Growth', 'etf'],
  ['IWM', 'Russell 2000 ETF', 'Small companies', 'etf'], ['RSP', 'S&P 500 Equal Weight ETF', 'Equal weight', 'etf'],
  ['TLT', '20+ Year Treasury Bond ETF', 'Treasury bonds', 'etf'], ['HYG', 'High Yield Corporate Bond ETF', 'Credit', 'etf'],
  ['GLD', 'Gold Shares', 'Gold', 'etf'], ['XLK', 'Technology Select Sector ETF', 'Technology', 'etf'],
  ['XLF', 'Financial Select Sector ETF', 'Financials', 'etf'], ['XLE', 'Energy Select Sector ETF', 'Energy', 'etf'],
  ['AAPL', 'Apple', 'Technology', 'stock'], ['MSFT', 'Microsoft', 'Technology', 'stock'],
  ['NVDA', 'NVIDIA', 'Technology', 'stock'], ['AMZN', 'Amazon', 'Consumer', 'stock'],
  ['GOOGL', 'Alphabet', 'Communication', 'stock'], ['META', 'Meta Platforms', 'Communication', 'stock'],
].map(row => Object.freeze(row)));
export const UNIVERSE_ID = 'reference-16-v1';
const symbols = UNIVERSE.map(row => row[0]);

export function validateMarketSnapshot(data, now = Date.now()) {
  object(data, ['schemaVersion', 'mode', 'universe', 'publishedAt', 'source', 'instruments'], 'market snapshot');
  if (data.schemaVersion !== 2) fail('Unsupported market schema');
  choice(data.mode, ['market'], 'market mode'); choice(data.universe, [UNIVERSE_ID], 'universe');
  const published = instant(data.publishedAt, 'publishedAt');
  if (published > now + 120000) fail('Future publication');
  const s = data.source;
  object(s, ['id', 'capturedAt', 'startTime', 'endTime', 'interval', 'bounds', 'adjustment', 'priceBasis'], 'market source');
  choice(s.id, ['connected-daily-history'], 'source');
  const captured = instant(s.capturedAt, 'capturedAt');
  const start = instant(s.startTime, 'startTime'), end = instant(s.endTime, 'endTime');
  if (start >= end || end > captured || captured > published) fail('Invalid source chronology');
  if (!s.startTime.endsWith('T00:00:00Z') || !s.endTime.endsWith('T00:00:00Z')) fail('Use complete UTC daily-label bounds');
  choice(s.interval, ['day'], 'interval'); choice(s.bounds, ['regular'], 'bounds');
  choice(s.adjustment, ['split'], 'adjustment'); choice(s.priceBasis, ['bar-last-trade'], 'price basis');
  list(data.instruments, 'instruments', 1, UNIVERSE.length);
  unique(data.instruments.map(x => x.symbol), 'symbols');
  for (const item of data.instruments) {
    object(item, ['symbol', 'bars'], 'market instrument'); choice(item.symbol, symbols, 'symbol');
    validateBars(item.bars, s.endTime.slice(0, 10));
    for (const bar of item.bars) if (bar.date < s.startTime.slice(0, 10) || bar.date >= s.endTime.slice(0, 10)) fail('Bar outside requested range');
  }
  return data;
}

// Descriptive price measurements only; never translated into thesis or buy/sell grades.
export function observations(bars) {
  const last = bars.at(-1), prior20 = bars.slice(-21, -1);
  const move = n => bars.length > n ? (last.close / bars.at(-1 - n).close - 1) * 100 : null;
  const average = values => values.reduce((sum, v) => sum + v, 0) / values.length;
  const mean20 = bars.length >= 20 ? average(bars.slice(-20).map(b => b.close)) : null;
  const volumeMean = prior20.length === 20 ? average(prior20.map(b => b.volume)) : null;
  return {
    change1: move(1), change5: move(5), change20: move(20),
    distance20: mean20 === null ? null : (last.close / mean20 - 1) * 100,
    below63High: bars.length >= 63 ? (last.close / Math.max(...bars.slice(-63).map(b => b.close)) - 1) * 100 : null,
    volumeRatio: volumeMean > 0 ? last.volume / volumeMean : null,
  };
}

export function presentMarketSnapshot(data, now = Date.now()) {
  validateMarketSnapshot(data, now);
  const instruments = UNIVERSE.flatMap(([symbol, name, sector, kind]) => {
    const input = data.instruments.find(x => x.symbol === symbol); if (!input) return [];
    const bars = input.bars;
    return [{ symbol, name, sector, kind, currency: 'USD', bars, previousClose: bars.at(-2).close,
      observations: observations(bars), sourceDate: bars.at(-1).date,
      scores: [5, 10, 20].map(horizon => ({ horizon, buy: null, sell: null, buyCoverage: 0, sellCoverage: 0, status: 'unassessed', vetoes: [] })),
    }];
  });
  const dates = instruments.map(x => x.sourceDate).sort();
  const lookup = symbol => instruments.find(x => x.symbol === symbol);
  const markets = [['SPY', 'Broad market · SPY'], ['QQQ', 'Growth · QQQ'], ['IWM', 'Small companies · IWM'], ['TLT', 'Long Treasuries · TLT']].flatMap(([symbol, label]) => {
    const item = lookup(symbol); return item ? [{ id: symbol, label, value: item.bars.at(-1).close, unit: 'USD', changePct: item.observations.change1, sparkline: item.bars.slice(-21).map(b => b.close), date: item.sourceDate }] : [];
  });
  const sectors = ['XLK', 'XLF', 'XLE'].flatMap(symbol => { const item = lookup(symbol); return item ? [{ name: `${item.sector} · ${symbol}`, changePct: item.observations.change1, date: item.sourceDate }] : []; });
  return { schemaVersion: 2, mode: 'market', publishedAt: data.publishedAt, servedAt: new Date(now).toISOString(), source: data.source,
    throughDate: dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}`,
    coverage: { universe: 'Independent reference universe · 16 stocks and ETFs', examined: instruments.length, total: UNIVERSE.length,
      note: 'A fixed reference list, not a market scan or a list of recommended investments. Private review assessments are not connected.' },
    instruments, markets, sectors };
}
