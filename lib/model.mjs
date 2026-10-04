export const METHOD = {
  id: 'strength-0.1-experimental',
  label: 'Experimental research rubric · v0.1',
  buy: [
    { key: 'thesis', label: 'Business & thesis', weight: 25 },
    { key: 'structure', label: 'Price & volume', weight: 25 },
    { key: 'valuation', label: 'Forward valuation', weight: 20 },
    { key: 'catalysts', label: 'Catalyst support', weight: 15 },
    { key: 'execution', label: 'Liquidity & entry', weight: 15 },
  ],
  sell: [
    { key: 'thesis', label: 'Thesis deterioration', weight: 35 },
    { key: 'structure', label: 'Structural damage', weight: 25 },
    { key: 'valuation', label: 'Valuation pressure', weight: 15 },
    { key: 'catalysts', label: 'Event downside', weight: 15 },
    { key: 'execution', label: 'Liquidity stress', weight: 10 },
  ],
  levels: ['No supporting evidence', 'Weak', 'Mixed', 'Strong', 'Very strong'],
  description: 'Each evidence group is assessed from 0 to 4. The weighted sum is scaled to 100 and rounded once. Buy and sell are independent. These are evidence-strength indices, not probabilities, execution instructions, or demonstrated predictive skill.',
};
const VETOES = ['THESIS_FAILURE', 'ACUTE_LIQUIDITY_STRESS', 'UNUSABLE_MARKET_DATA'];
const prohibited = /(?:\b(?:portfolio|account|holdings|buying power|cost basis|tax lot|robinhood)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:sk-proj-|ghp_|github_pat_))/i;
function fail(message) { throw new Error(message); }
function object(value, keys, at) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${at}: expected object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${at}: Unexpected field`);
  for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${at}: missing ${key}`);
}
function text(value, at, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || prohibited.test(value) || /[<>\u0000-\u001f]/.test(value)) fail(`${at}: unsupported text`);
}
function number(value, at, min = -1e12, max = 1e12) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${at}: invalid number`);
}
function list(value, at, min = 0, max = 100) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${at}: invalid list`);
}
function date(value, at) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value) fail(`${at}: invalid date`);
}
function instant(value, at) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${at}: invalid UTC timestamp`);
  if (new Date(value).toISOString().replace('.000Z', 'Z') !== value.replace('.000Z', 'Z')) fail(`${at}: invalid calendar timestamp`);
  return Date.parse(value);
}
function unique(values, at) { if (new Set(values).size !== values.length) fail(`${at}: duplicates`); }
function choice(value, choices, at) { if (!choices.includes(value)) fail(`${at}: unsupported value`); }

export function validateSnapshot(data, now = Date.now()) {
  object(data, ['schemaVersion', 'mode', 'methodology', 'publishedAt', 'coverage', 'sources', 'markets', 'sectors', 'instruments'], 'snapshot');
  if (data.schemaVersion !== 1 || data.methodology !== METHOD.id) fail('Unsupported schema or methodology');
  choice(data.mode, ['demo', 'research'], 'mode');
  const published = instant(data.publishedAt, 'publishedAt');
  if (published > now + 120000) fail('Future publication');
  object(data.coverage, ['universe', 'examined', 'total', 'note'], 'coverage');
  text(data.coverage.universe, 'universe', 150); text(data.coverage.note, 'coverage note');
  number(data.coverage.examined, 'examined', 0, 100000); number(data.coverage.total, 'total', 1, 100000);
  if (!Number.isInteger(data.coverage.examined) || !Number.isInteger(data.coverage.total) || data.coverage.examined > data.coverage.total) fail('Invalid coverage count');
  list(data.sources, 'sources', 1, 100);
  for (const source of data.sources) {
    object(source, ['id', 'label', 'url', 'asOf', 'usage', 'delayMinutes'], 'source');
    text(source.id, 'source id', 50); text(source.label, 'source label', 100);
    if (instant(source.asOf, 'source asOf') > published) fail('Source available after publication');
    choice(source.usage, data.mode === 'demo' ? ['synthetic'] : ['personal-display'], 'source usage');
    number(source.delayMinutes, 'delay', 0, 10080);
    if (source.url !== null) {
      text(source.url, 'source URL', 400);
      let url; try { url = new URL(source.url); } catch { fail('Invalid source URL'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port || /(?:localhost|chatgpt\.com|127\.0\.0\.1)/i.test(url.hostname)) fail('Unsupported source URL');
    }
  }
  unique(data.sources.map(x => x.id), 'source IDs');
  const sources = new Map(data.sources.map(x => [x.id, x]));
  const ref = id => { if (!sources.has(id)) fail('Unknown source'); };
  list(data.markets, 'markets', 0, 12);
  for (const market of data.markets) {
    object(market, ['id', 'label', 'value', 'unit', 'changePct', 'sparkline', 'sourceId'], 'market');
    text(market.id, 'market id', 40); text(market.label, 'market label', 80);
    choice(market.unit, ['points', '%', 'USD'], 'market unit');
    number(market.value, 'market value'); number(market.changePct, 'market change', -100, 1000);
    list(market.sparkline, 'sparkline', 2, 100); market.sparkline.forEach(x => number(x, 'sparkline value'));
    ref(market.sourceId);
  }
  unique(data.markets.map(x => x.id), 'market IDs');
  list(data.sectors, 'sectors', 0, 20);
  for (const sector of data.sectors) {
    object(sector, ['name', 'changePct', 'sourceId'], 'sector');
    text(sector.name, 'sector name', 60); number(sector.changePct, 'sector change', -100, 1000); ref(sector.sourceId);
  }
  unique(data.sectors.map(x => x.name), 'sectors');
  list(data.instruments, 'instruments', 1, 100);
  if (data.coverage.examined < data.instruments.length) fail('Coverage below listed instruments');
  for (const item of data.instruments) {
    object(item, ['symbol', 'name', 'sector', 'kind', 'currency', 'asOf', 'validUntil', 'sourceIds', 'previousClose', 'bars', 'thesis', 'assessments', 'events'], 'instrument');
    if (typeof item.symbol !== 'string' || !/^[A-Z][A-Z0-9.-]{0,11}$/.test(item.symbol)) fail('Invalid symbol');
    text(item.name, 'name', 100); text(item.sector, 'sector', 60);
    choice(item.kind, ['stock', 'etf'], 'kind'); choice(item.currency, ['USD'], 'currency');
    const asOf = instant(item.asOf, 'instrument asOf');
    const expiry = instant(item.validUntil, 'validUntil');
    if (asOf > published || expiry <= asOf || expiry - asOf > 7 * 86400000) fail('Invalid research validity window');
    list(item.sourceIds, 'source IDs', 1, 20); item.sourceIds.forEach(ref); unique(item.sourceIds, 'instrument source IDs');
    if (item.sourceIds.some(id => Date.parse(sources.get(id).asOf) > asOf)) fail('Source newer than assessment');
    number(item.previousClose, 'previous close', 0.000001);
    list(item.bars, 'bars', 2, 500);
    let previousDate = '';
    for (const bar of item.bars) {
      object(bar, ['date', 'open', 'high', 'low', 'close', 'volume'], 'bar');
      date(bar.date, 'bar date');
      if (bar.date <= previousDate || bar.date > item.asOf.slice(0, 10)) fail('Invalid bar chronology');
      previousDate = bar.date;
      for (const key of ['open', 'high', 'low', 'close']) number(bar[key], key, 0.000001);
      number(bar.volume, 'volume', 0);
      if (!Number.isInteger(bar.volume) || bar.low > Math.min(bar.open, bar.close) || bar.high < Math.max(bar.open, bar.close) || bar.low > bar.high) fail('Invalid OHLCV relationship');
    }
    if (item.previousClose !== item.bars.at(-2).close) fail('Previous close disagrees with bar history');
    object(item.thesis, ['status', 'evidence', 'contrary', 'invalidation'], 'thesis');
    choice(item.thesis.status, ['INTACT', 'CHALLENGED', 'INVALIDATED'], 'thesis status');
    for (const key of ['evidence', 'contrary', 'invalidation']) text(item.thesis[key], key, 700);
    list(item.assessments, 'assessments', 1, 3); unique(item.assessments.map(x => x.horizon), 'horizons');
    for (const assessment of item.assessments) {
      object(assessment, ['horizon', 'buy', 'sell', 'vetoes'], 'assessment');
      choice(assessment.horizon, [5, 10, 20], 'horizon');
      for (const direction of ['buy', 'sell']) {
        object(assessment[direction], METHOD[direction].map(x => x.key), direction);
        for (const component of Object.values(assessment[direction])) {
          object(component, ['level', 'reason'], 'component');
          if (component.level !== null && (!Number.isInteger(component.level) || component.level < 0 || component.level > 4)) fail('Invalid component level');
          text(component.reason, 'component reason');
        }
      }
      list(assessment.vetoes, 'vetoes', 0, 3); unique(assessment.vetoes, 'vetoes'); assessment.vetoes.forEach(x => choice(x, VETOES, 'veto'));
      if (item.thesis.status === 'INVALIDATED' && !assessment.vetoes.includes('THESIS_FAILURE')) fail('Invalidated thesis requires a buy veto');
    }
    list(item.events, 'events', 0, 12);
    for (const event of item.events) {
      object(event, ['date', 'title', 'status', 'sourceId'], 'event');
      date(event.date, 'event date'); text(event.title, 'event title', 120); choice(event.status, ['confirmed', 'estimated'], 'event status'); ref(event.sourceId);
    }
  }
  unique(data.instruments.map(x => x.symbol), 'symbols');
  return data;
}

export function evaluate(item, horizon, now = Date.now(), mode = 'research') {
  const assessment = item.assessments.find(x => x.horizon === horizon);
  const result = { horizon, buy: null, sell: null, buyCoverage: 0, sellCoverage: 0, status: 'unavailable', vetoes: assessment?.vetoes ?? [] };
  if (!assessment) return result;
  const stale = mode !== 'demo' && now >= Date.parse(item.validUntil);
  for (const direction of ['buy', 'sell']) {
    const components = METHOD[direction];
    const present = components.filter(x => assessment[direction][x.key].level !== null);
    result[direction + 'Coverage'] = present.length / components.length * 100;
    if (!stale && present.length === components.length) result[direction] = Math.round(components.reduce((sum, x) => sum + x.weight * assessment[direction][x.key].level / 4, 0));
  }
  result.status = stale ? 'stale' : 'ready';
  if (!stale && assessment.vetoes.length) { result.buy = null; result.status = 'blocked'; }
  if (result.status === 'ready' && (result.buy === null || result.sell === null)) result.status = 'partial';
  return result;
}

export function presentSnapshot(data, now = Date.now()) {
  validateSnapshot(data, now);
  return { ...data, servedAt: new Date(now).toISOString(), method: METHOD,
    instruments: data.instruments.map(item => ({ ...item, scores: [5, 10, 20].map(h => evaluate(item, h, now, data.mode)) })) };
}
