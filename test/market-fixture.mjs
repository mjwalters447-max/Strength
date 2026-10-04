// Deliberately synthetic arithmetic fixture; never imported as actual source data.
export function marketInput() {
  return { schemaVersion: 1, retrievedAt: '2026-10-04T07:00:00Z', startTime: '2026-06-01T00:00:00Z', endTime: '2026-10-03T00:00:00Z', interval: 'day', bounds: 'regular', adjustment: 'split', results: [{ symbol: 'SPY', bounds: 'regular', interval: 'day', bars: Array.from({ length: 70 }, (_, i) => ({ begins_at: new Date(Date.UTC(2026, 5, 1 + i)).toISOString().replace('.000Z', 'Z'), open_price: String(100 + i), high_price: String(102 + i), low_price: String(99 + i), close_price: String(101 + i), volume: 100, session: 'reg' })) }] };
}
