import { METHOD } from './model.mjs';

// Deliberately fictional issuers and prices. Dates never advance on refresh.
export function demoSnapshot() {
  const asOf = '2026-10-02T20:15:00Z';
  const definitions = [
    ['NOVA', 'Nova Systems', 'Technology', 142, 0.28, [3, 4, 2, 3, 4], [0, 1, 2, 1, 0], 'INTACT'],
    ['VERD', 'Verdant Energy', 'Energy', 68, 0.12, [3, 3, 3, 2, 3], [1, 1, 1, 2, 0], 'INTACT'],
    ['ATLS', 'Atlas Industries', 'Industrials', 105, 0.16, [4, 2, 3, 3, 3], [0, 2, 1, 1, 1], 'INTACT'],
    ['LUMA', 'Luma Health', 'Health care', 82, -0.09, [2, 1, 3, 2, 2], [2, 3, 1, 3, 1], 'CHALLENGED'],
    ['ORBT', 'Orbit Consumer', 'Consumer', 51, -0.18, [1, 1, 2, 1, 2], [3, 4, 2, 2, 1], 'CHALLENGED'],
    ['WIDE', 'Broad Market Sample ETF', 'Broad market', 215, 0.19, [3, 3, 2, 2, 4], [0, 1, 2, 1, 0], 'INTACT'],
  ];
  const buyReasons = [
    'Illustrative earnings growth and cash generation support the operating thesis.',
    'Illustrative price structure shows higher lows with improving participation.',
    'Illustrative valuation allows some upside, with sensitivity to growth expectations.',
    'The fictional upcoming update could provide evidence of improving demand.',
    'Illustrative spreads and turnover support orderly entry; price discipline still matters.',
  ];
  const sellReasons = [
    'Illustrative operating evidence shows limited deterioration; reassess after the next update.',
    'Illustrative support and volume patterns determine structural damage, independently of buy interest.',
    'Illustrative valuation leaves some exposure to a contraction in expectations.',
    'A fictional reporting event creates two-sided gap risk. It is not a forecast.',
    'Illustrative market depth is orderly; liquidity conditions can change abruptly.',
  ];
  const instruments = definitions.map(([symbol, name, sector, start, drift, buy, sell, status], index) => {
    const bars = [];
    let close = start;
    for (let day = new Date('2026-05-01T00:00:00Z'), n = 0; day <= new Date('2026-10-02T00:00:00Z'); day.setUTCDate(day.getUTCDate() + 1)) {
      if ([0, 6].includes(day.getUTCDay())) continue;
      const open = close;
      close = Math.round((open + drift + Math.sin(n * .58 + index) * 1.1 + Math.cos(n * .19) * .38) * 100) / 100;
      bars.push({ date: day.toISOString().slice(0, 10), open, close, high: Math.round((Math.max(open, close) + 1.3) * 100) / 100, low: Math.round((Math.min(open, close) - 1.1) * 100) / 100, volume: Math.round((1.4 + Math.abs(Math.sin(n * 1.6 + index))) * 1000000) }); n++;
    }
    return { symbol, name, sector, kind: symbol === 'WIDE' ? 'etf' : 'stock', currency: 'USD', asOf, validUntil: '2026-10-05T13:30:00Z', sourceIds: ['sample'], previousClose: bars.at(-2).close, bars,
      thesis: { status, evidence: status === 'INTACT' ? 'The sample business thesis remains supported by improving demand and cash generation. The chart illustrates a constructive trend, not a real security.' : 'The sample thesis is challenged by weaker demand and persistent price-volume damage. New evidence is needed before increasing conviction.', contrary: 'Expectations may already reflect the improvement. Slower growth or higher yields could compress valuation; a strong chart alone does not establish upside.', invalidation: 'Reassess if operating evidence contradicts the thesis or sustained price-volume damage breaks the stated structure. No mechanical price stop is implied.' },
      assessments: [5, 10, 20].map((horizon, hi) => ({ horizon,
        buy: Object.fromEntries(METHOD.buy.map((c, j) => [c.key, { level: index === 3 && j === 2 ? null : Math.max(0, Math.min(4, buy[j] + (hi === 2 && j === 0 ? 1 : 0))), reason: index === 3 && j === 2 ? 'A comparable valuation assessment is missing from this example.' : buyReasons[j] }])),
        sell: Object.fromEntries(METHOD.sell.map((c, j) => [c.key, { level: Math.max(0, sell[j] - (hi === 2 && j === 3 ? 1 : 0)), reason: sellReasons[j] }])), vetoes: [] })),
      events: [{ date: '2026-10-22', title: 'Illustrative earnings update', status: 'estimated', sourceId: 'sample' }],
    };
  });
  return { schemaVersion: 1, mode: 'demo', methodology: METHOD.id, publishedAt: asOf,
    coverage: { universe: 'Fictional cross-sector sample', examined: 6, total: 6, note: 'Six fictional instruments demonstrate the interface. This is not a market scan or current research.' },
    sources: [{ id: 'sample', label: 'Synthetic interface examples', url: null, asOf, usage: 'synthetic', delayMinutes: 0 }],
    markets: [
      { id: 'broad', label: 'Broad market', value: 5842.31, unit: 'points', changePct: .84, sparkline: [22, 24, 21, 28, 26, 30, 27, 32, 31, 37, 35, 41], sourceId: 'sample' },
      { id: 'growth', label: 'Growth', value: 20316.74, unit: 'points', changePct: 1.26, sparkline: [20, 22, 21, 19, 28, 25, 32, 30, 36, 33, 40, 43], sourceId: 'sample' },
      { id: 'volatility', label: 'Volatility', value: 18.42, unit: 'points', changePct: -3.18, sparkline: [40, 36, 38, 30, 33, 25, 27, 22, 24, 18, 21, 17], sourceId: 'sample' },
      { id: 'yield', label: '10-year yield', value: 4.12, unit: '%', changePct: -.48, sparkline: [31, 29, 30, 32, 29, 27, 28, 25, 26, 24, 25, 24], sourceId: 'sample' },
    ],
    sectors: [['Technology', 1.42], ['Industrials', .88], ['Energy', .61], ['Financials', .34], ['Health care', -.27], ['Consumer', -.68]].map(([name, changePct]) => ({ name, changePct, sourceId: 'sample' })), instruments,
  };
}
