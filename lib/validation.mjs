const prohibited = /(?:\b(?:portfolio|account|holdings|buying power|cost basis|tax lot|robinhood)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:sk-proj-|ghp_|github_pat_))/i;
export function fail(message) { throw new Error(message); }
export function object(value, keys, at) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${at}: expected object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${at}: Unexpected field`);
  for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${at}: missing ${key}`);
}
export function text(value, at, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || prohibited.test(value) || /[<>\u0000-\u001f]/.test(value)) fail(`${at}: unsupported text`);
}
export function number(value, at, min = -1e12, max = 1e12) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${at}: invalid number`);
}
export function list(value, at, min = 0, max = 100) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${at}: invalid list`);
}
export function date(value, at) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail(`${at}: invalid date`);
}
export function instant(value, at) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${at}: invalid UTC timestamp`);
  if (new Date(value).toISOString().replace('.000Z', 'Z') !== value.replace('.000Z', 'Z')) fail(`${at}: invalid calendar timestamp`);
  return Date.parse(value);
}
export function unique(values, at) { if (new Set(values).size !== values.length) fail(`${at}: duplicates`); }
export function choice(value, choices, at) { if (!choices.includes(value)) fail(`${at}: unsupported value`); }
export function validateBars(bars, throughDate) {
  list(bars, 'bars', 2, 500);
  let previousDate = '';
  for (const bar of bars) {
    object(bar, ['date', 'open', 'high', 'low', 'close', 'volume'], 'bar');
    date(bar.date, 'bar date');
    if (bar.date <= previousDate || bar.date > throughDate) fail('Invalid bar chronology');
    previousDate = bar.date;
    for (const key of ['open', 'high', 'low', 'close']) number(bar[key], key, 0.000001);
    number(bar.volume, 'volume', 0);
    if (!Number.isInteger(bar.volume) || bar.low > Math.min(bar.open, bar.close) || bar.high < Math.max(bar.open, bar.close) || bar.low > bar.high) fail('Invalid OHLCV relationship');
  }
}
