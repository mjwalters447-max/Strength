const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = value => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const change = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
const sign = value => value >= 0 ? 'positive' : 'negative';
const stamp = value => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
const dayLabel = value => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
let data, selected, horizon = 10, tab = 'overview', range = 63, nav = 'overview', loading = false;

async function request(path, body) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' } : { cache: 'no-store' });
  let result; try { result = await response.json(); } catch { throw new Error('The server did not return a valid response.'); }
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/login') { location.replace('/'); return; }
    throw new Error(result.error ?? 'Unable to complete the request.');
  }
  return result;
}
if ($('#login-form')) {
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.currentTarget.querySelector('button');
    button.disabled = true; $('#login-error').textContent = '';
    try { await request('/api/login', { password: $('#password').value }); $('#password').value = ''; location.replace('/'); }
    catch (error) { $('#login-error').textContent = error.message; button.disabled = false; }
  });
} else {
  $('#search').addEventListener('input', renderList);
  $('#sort').addEventListener('change', renderList);
  $('#refresh').addEventListener('click', load);
  for (const button of document.querySelectorAll('[data-nav]')) button.addEventListener('click', () => navigate(button.dataset.nav));
  for (const button of [$('#logout'), $('#mobile-logout')]) button.addEventListener('click', async () => {
    button.disabled = true;
    try { await request('/api/logout', {}); data = null; $('#detail').replaceChildren(); location.replace('/'); }
    catch (error) { $('#load-error').hidden = false; $('#load-error').textContent = error.message; button.disabled = false; }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  // Polls only the local snapshot, never a market provider or a review task.
  setInterval(() => { if (!document.hidden) load(); }, 60000);
  load();
}

async function load() {
  if (loading) return;
  loading = true; $('#refresh').disabled = true;
  try {
    const next = await request('/api/snapshot');
    if (!next) return;
    data = next;
    if (!data.instruments.some(x => x.symbol === selected)) selected = data.instruments[0].symbol;
    $('#load-error').hidden = true;
    $('#mode-label').textContent = data.mode === 'demo' ? 'SYNTHETIC PREVIEW' : 'RESEARCH SNAPSHOT';
    $('#as-of').textContent = `${data.mode === 'demo' ? 'Sample' : 'Research'} · ${stamp(data.publishedAt)}`;
    $('#notice').textContent = data.mode === 'demo'
      ? 'Sample workspace · Every issuer, chart, event, and grade below is fictional. No live data is connected.'
      : 'Dated research · Experimental grades are not probabilities or trade instructions. Inspect source dates and evidence.';
    renderMarkets(); renderList(); renderDetail(); renderSources(); renderMethod(); navigate(nav);
  } catch (error) {
    data = null;
    for (const id of ['#market-grid', '#sector-grid', '#instrument-list', '#detail', '#sources', '#method-panel']) $(id).replaceChildren();
    $('#as-of').textContent = 'Research unavailable'; $('#mode-label').textContent = 'UNAVAILABLE';
    $('#notice').textContent = 'No research is being shown. Refresh after the source becomes available.';
    $('#research-count').textContent = '—'; $('#coverage-note').textContent = '';
    $('#load-error').hidden = false; $('#load-error').textContent = error.message;
  } finally { loading = false; $('#refresh').disabled = false; }
}
function navigate(destination) {
  nav = destination;
  $('#page-label').textContent = destination === 'method' ? 'Methodology' : destination[0].toUpperCase() + destination.slice(1);
  $('#overview-panel').hidden = destination !== 'overview';
  $('#research-panel').hidden = destination === 'method';
  $('#method-panel').hidden = destination !== 'method';
  for (const button of document.querySelectorAll('[data-nav]')) {
    button.classList.toggle('active', button.dataset.nav === destination);
    button.setAttribute('aria-current', button.dataset.nav === destination ? 'page' : 'false');
  }
}
function spark(values, color) {
  const min = Math.min(...values), spread = Math.max(...values) - min || 1;
  const points = values.map((v, i) => `${i / (values.length - 1) * 90},${34 - (v - min) / spread * 30}`).join(' ');
  return `<svg class="market-spark" viewBox="0 0 92 38" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}
function renderMarkets() {
  $('#market-grid').innerHTML = data.markets.map(m => `<article class="panel market-card"><div class="market-label"><span>${escape(m.label)}</span><span aria-hidden="true">↗</span></div><div class="market-number">${money(m.value)}${m.unit === '%' ? '%' : ''}</div><span class="market-change ${sign(m.changePct)}">${change(m.changePct)}</span>${spark(m.sparkline, '#a4ba8c')}</article>`).join('');
  $('#sector-grid').innerHTML = data.sectors.map(s => `<div class="sector-cell ${s.changePct < 0 ? 'negative-bg' : ''}"><span>${escape(s.name)}</span><strong class="${sign(s.changePct)}">${change(s.changePct)}</strong></div>`).join('');
}
const currentScore = item => item.scores.find(s => s.horizon === horizon);
function renderList() {
  if (!data) return;
  const query = $('#search').value.trim().toLowerCase();
  const sort = $('#sort').value;
  const items = data.instruments.filter(item => `${item.symbol} ${item.name} ${item.sector}`.toLowerCase().includes(query));
  items.sort((a, b) => sort === 'symbol' ? a.symbol.localeCompare(b.symbol) : (currentScore(b)[sort] ?? -1) - (currentScore(a)[sort] ?? -1) || a.symbol.localeCompare(b.symbol));
  $('#research-count').textContent = items.length;
  $('#instrument-list').innerHTML = items.length ? items.map(item => {
    const score = currentScore(item);
    return `<button class="instrument-row ${selected === item.symbol ? 'selected' : ''}" data-symbol="${escape(item.symbol)}" aria-pressed="${selected === item.symbol}" aria-label="Inspect ${escape(item.symbol)}, buy ${score.buy ?? 'unavailable'}, sell ${score.sell ?? 'unavailable'}"><span class="instrument-info"><span class="ticker-icon" aria-hidden="true">${escape(item.symbol.slice(0, 2))}</span><span class="instrument-name"><strong>${escape(item.symbol)}</strong><span>${escape(item.name)}</span></span></span><span class="mini-scores"><span class="mini-score">${score.buy ?? '—'}</span><span class="mini-score sell">${score.sell ?? '—'}</span></span></button>`;
  }).join('') : '<p class="empty-state">No matching instruments.<br>Try another symbol or sector.</p>';
  for (const button of document.querySelectorAll('[data-symbol]')) button.addEventListener('click', () => { selected = button.dataset.symbol; renderList(); renderDetail(); });
  $('#coverage-note').textContent = `${data.coverage.examined} examined / ${data.coverage.total} in declared universe. ${data.mode === 'demo' ? 'Fictional sample only.' : 'Coverage is not a whole-market claim.'}`;
}
function gauge(value, color) {
  return `<svg class="gauge" viewBox="0 0 100 58" aria-hidden="true"><path d="M10 50 A40 40 0 0 1 90 50" pathLength="100" fill="none" stroke="#3a4238" stroke-width="7" stroke-linecap="round"/><path d="M10 50 A40 40 0 0 1 90 50" pathLength="100" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${value ?? 0} 100"/></svg>`;
}
function scoreLabel(value) { return value === null ? 'Insufficient current evidence' : value >= 75 ? 'Strong supporting evidence' : value >= 50 ? 'Mixed to supportive evidence' : value >= 25 ? 'Limited supporting evidence' : 'Little supporting evidence'; }
function renderDetail() {
  if (!data) return;
  const item = data.instruments.find(x => x.symbol === selected), score = currentScore(item);
  const latest = item.bars.at(-1), move = (latest.close / item.previousClose - 1) * 100;
  $('#detail').innerHTML = `<div class="detail-top"><div class="detail-identity"><span class="ticker-icon" aria-hidden="true">${escape(item.symbol.slice(0, 2))}</span><div><h2 class="detail-name">${escape(item.symbol)}</h2><p class="detail-subtitle">${escape(item.name)} · ${escape(item.sector)}</p></div></div><span class="thesis-pill ${item.thesis.status !== 'INTACT' ? 'challenged' : ''}">THESIS ${escape(item.thesis.status)}</span></div><div class="price-row"><div><div class="quote">$${money(latest.close)}</div><p class="quote-change ${sign(move)}">${change(move)} <span class="muted">· ${data.mode === 'demo' ? 'sample close' : 'last recorded close'}</span></p></div><div><p class="horizon-label">Research horizon · sessions</p><div class="segmented" aria-label="Research horizon">${[5, 10, 20].map(h => `<button data-horizon="${h}" class="${h === horizon ? 'active' : ''}" aria-pressed="${h === horizon}">${h} sessions</button>`).join('')}</div></div></div>${score.status === 'stale' ? '<div class="error-banner small">This assessment has expired. Current grades are unavailable until research is renewed.</div>' : ''}${score.vetoes.length ? `<div class="error-banner small">Buy assessment blocked: ${score.vetoes.map(v => escape(v.replaceAll('_', ' ').toLowerCase())).join(', ')}.</div>` : ''}<div class="score-grid">${['buy', 'sell'].map(direction => `<section class="score-card ${direction === 'sell' ? 'sell' : ''}"><div class="score-header"><span>${direction === 'buy' ? 'Buy strength' : 'Sell strength'}</span><span>${direction === 'buy' ? 'Opportunity' : 'Exit pressure'}</span></div><div class="score-body"><div><div class="score-number">${score[direction] ?? '—'}<span>/100</span></div><div class="score-copy">${scoreLabel(score[direction])}</div></div>${gauge(score[direction], direction === 'buy' ? '#b9f36e' : '#c6b6ee')}</div><p class="score-foot">Evidence coverage ${score[direction + 'Coverage']}% · Experimental</p></section>`).join('')}</div><div class="tabs" role="tablist" aria-label="Research detail">${['overview', 'evidence', 'catalysts'].map(t => `<button role="tab" id="tab-${t}" aria-selected="${tab === t}" aria-controls="detail-pane" class="${tab === t ? 'active' : ''}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><div id="detail-pane" role="tabpanel" aria-labelledby="tab-${tab}"></div>`;
  for (const button of document.querySelectorAll('[data-horizon]')) button.addEventListener('click', () => { horizon = Number(button.dataset.horizon); renderList(); renderDetail(); document.querySelector(`[data-horizon="${horizon}"]`).focus(); });
  for (const button of document.querySelectorAll('[data-tab]')) {
    button.addEventListener('click', () => { tab = button.dataset.tab; renderDetail(); $(`#tab-${tab}`).focus(); });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const tabs = ['overview', 'evidence', 'catalysts'];
      const index = tabs.indexOf(tab); tab = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[2] : tabs[(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
      renderDetail(); $(`#tab-${tab}`).focus();
    });
  }
  if (tab === 'overview') renderChart(item);
  else if (tab === 'evidence') renderEvidence(item);
  else renderEvents(item);
}
function renderChart(item) {
  const bars = item.bars.slice(-range), w = 620, left = 6, right = 54, top = 18, bottom = 182, plot = w - right - left;
  const averages = item.bars.map((_, i, all) => i < 19 ? null : all.slice(i - 19, i + 1).reduce((s, b) => s + b.close, 0) / 20).slice(-range);
  const values = [...bars.map(b => b.close), ...averages.filter(x => x !== null)];
  const low = Math.min(...values), high = Math.max(...values), padding = (high - low) * .15 || 1;
  const min = low - padding, max = high + padding;
  const x = i => left + i / (bars.length - 1) * plot, y = value => bottom - (value - min) / (max - min) * (bottom - top);
  const points = bars.map((b, i) => `${x(i).toFixed(2)},${y(b.close).toFixed(2)}`).join(' ');
  const averagePoints = averages.flatMap((a, i) => a === null ? [] : [`${x(i).toFixed(2)},${y(a).toFixed(2)}`]).join(' ');
  const maxVolume = Math.max(...bars.map(b => b.volume), 1);
  const grid = [0, 1, 2, 3].map(i => { const price = min + (max - min) * i / 3; return `<line x1="${left}" y1="${y(price)}" x2="${w - right}" y2="${y(price)}" stroke="#30392f" stroke-dasharray="3 5"/><text x="${w - right + 10}" y="${y(price) + 3}">${money(price)}</text>`; }).join('');
  $('#detail-pane').innerHTML = `<div class="chart-toolbar"><div class="chart-legend"><span><i class="legend-key"></i>Price</span><span><i class="legend-key average"></i>20-bar average</span></div><div class="segmented" aria-label="Chart range">${[[21, '1M'], [63, '3M'], [126, '6M']].map(([n, label]) => `<button data-range="${n}" class="${range === n ? 'active' : ''}" aria-pressed="${range === n}">${label}</button>`).join('')}</div></div><div id="chart-readout" class="chart-readout">${dayLabel(bars.at(-1).date)} · Close $${money(bars.at(-1).close)}</div><svg id="price-chart" class="chart" viewBox="0 0 620 264" role="img" tabindex="0" aria-label="${escape(item.symbol)} closing price and volume chart, ${dayLabel(bars[0].date)} to ${dayLabel(bars.at(-1).date)}. Use left and right arrow keys to inspect bars."><title>Price and volume · ${data.mode === 'demo' ? 'synthetic examples' : 'dated source bars'}</title><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b9f36e" stop-opacity=".15"/><stop offset="100%" stop-color="#b9f36e" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${left},${bottom} ${points} ${w - right},${bottom}" fill="url(#chart-fill)"/><polyline points="${averagePoints}" fill="none" stroke="#8297a5" stroke-width="1.3" stroke-dasharray="4 3"/><polyline points="${points}" fill="none" stroke="#b9f36e" stroke-width="2" stroke-linejoin="round"/>${bars.map((b, i) => `<rect x="${x(i) - plot / bars.length * .3}" y="${231 - b.volume / maxVolume * 32}" width="${Math.max(1, plot / bars.length * .6)}" height="${b.volume / maxVolume * 32}" fill="${b.close >= b.open ? '#435a35' : '#5b443a'}"/>`).join('')}<text x="${left}" y="251">${dayLabel(bars[0].date)}</text><text x="${plot / 2}" y="251" text-anchor="middle">${dayLabel(bars[Math.floor(bars.length / 2)].date)}</text><text x="${w - right}" y="251" text-anchor="end">${dayLabel(bars.at(-1).date)}</text><text x="${w - right + 10}" y="218">VOL</text><line id="crosshair" x1="${x(bars.length - 1)}" y1="15" x2="${x(bars.length - 1)}" y2="232" stroke="#839475" stroke-dasharray="3 3" opacity="0"/><circle id="chart-dot" cx="${x(bars.length - 1)}" cy="${y(bars.at(-1).close)}" r="3.5" fill="#d3ff9b"/></svg><p class="chart-status">${bars.length} available bars · ${data.mode === 'demo' ? 'Fictional prices and volume' : 'USD · source daily bars'} · ${stamp(item.asOf)}</p><div class="thesis-summary"><div class="eyebrow">THE RESEARCH VIEW</div><p>${escape(item.thesis.evidence)}</p></div>`;
  for (const button of document.querySelectorAll('[data-range]')) button.addEventListener('click', () => { range = Number(button.dataset.range); renderChart(item); document.querySelector(`[data-range="${range}"]`).focus(); });
  let active = bars.length - 1;
  function inspect(index) {
    active = Math.max(0, Math.min(bars.length - 1, index)); const b = bars[active];
    $('#chart-readout').textContent = `${dayLabel(b.date)} · Close $${money(b.close)} · Volume ${(b.volume / 1000000).toFixed(2)}M`;
    $('#crosshair').setAttribute('x1', x(active)); $('#crosshair').setAttribute('x2', x(active)); $('#crosshair').setAttribute('opacity', '.7');
    $('#chart-dot').setAttribute('cx', x(active)); $('#chart-dot').setAttribute('cy', y(b.close));
  }
  $('#price-chart').addEventListener('pointermove', event => { const box = event.currentTarget.getBoundingClientRect(); inspect(Math.round(((event.clientX - box.left) / box.width * w - left) / plot * (bars.length - 1))); });
  $('#price-chart').addEventListener('pointerleave', () => { $('#crosshair').setAttribute('opacity', '0'); });
  $('#price-chart').addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); inspect(event.key === 'Home' ? 0 : event.key === 'End' ? bars.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1)); } });
}
function renderEvidence(item) {
  const assessment = item.assessments.find(x => x.horizon === horizon);
  if (!assessment) { $('#detail-pane').innerHTML = '<p class="empty-state">No assessment is available for this horizon.</p>'; return; }
  $('#detail-pane').innerHTML = `<div class="evidence-pane"><p class="evidence-intro">${horizon}-session assessment · Factors are scored 0–4. Coverage measures completeness, not the probability of a successful outcome.</p>${['buy', 'sell'].map(direction => `<section class="evidence-group"><div class="evidence-title"><strong>${direction === 'buy' ? 'Buy case' : 'Exit-pressure case'}</strong><span class="muted small">Weight · evidence</span></div>${data.method[direction].map(factor => { const component = assessment[direction][factor.key]; return `<div class="factor"><div class="factor-header">${escape(factor.label)}<span>${factor.weight}% · ${component.level === null ? 'Missing' : component.level + '/4'}</span></div><svg class="factor-meter" viewBox="0 0 100 5" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="5" rx="2" fill="#30392f"/><rect width="${(component.level ?? 0) * 25}" height="5" rx="2" fill="${direction === 'buy' ? '#b9f36e' : '#c6b6ee'}"/></svg><p>${escape(component.reason)}</p></div>`; }).join('')}</section>`).join('')}<div class="evidence-note"><h3>The opposing case</h3><p>${escape(item.thesis.contrary)}</p></div><div class="evidence-note"><h3>What would change the thesis</h3><p>${escape(item.thesis.invalidation)}</p></div><p class="small muted">Assessed ${stamp(item.asOf)} · Valid until ${stamp(item.validUntil)}${data.mode === 'demo' ? ' · Demo dates only' : ''}</p></div>`;
}
function renderEvents(item) {
  $('#detail-pane').innerHTML = `<div class="evidence-pane"><p class="evidence-intro">${data.mode === 'demo' ? 'Illustrative events only. These are not real corporate dates.' : 'Confirmed and estimated event dates are distinguished. An event is not a predicted outcome.'}</p>${item.events.length ? item.events.map(event => `<div class="event"><div class="event-date"><small>${dayLabel(event.date).split(' ')[0]}</small>${Number(event.date.slice(-2))}</div><div><h3>${escape(event.title)}</h3><p>${escape(event.status)} · ${escape(event.date)} · ${escape(data.sources.find(s => s.id === event.sourceId).label)}</p></div></div>`).join('') : '<p class="empty-state">No sourced events in this snapshot.</p>'}<div class="evidence-note"><h3>Event risk is two-sided</h3><p>Positive catalysts can still disappoint. Event pressure is shown separately from the underlying business thesis.</p></div></div>`;
}
function renderSources() {
  $('#sources').innerHTML = `<div class="source-card"><strong>${escape(data.coverage.universe)}</strong><p>${escape(data.coverage.note)}</p><p>Published ${stamp(data.publishedAt)} · Refreshing does not renew research.</p></div>${data.sources.map(source => `<div class="source-card"><strong>${escape(source.label)}</strong><p>Source as of ${stamp(source.asOf)} · ${data.mode === 'demo' ? 'Synthetic' : `${source.delayMinutes}-minute declared delay`}</p>${source.url ? `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : '<p>No external data connection</p>'}</div>`).join('')}`;
}
function renderMethod() {
  $('#method-panel').innerHTML = `<div class="eyebrow">TRANSPARENT BY DESIGN</div><h2>${escape(data.method.label)}</h2><p>${escape(data.method.description)}</p><p>These draft weights are a display experiment. They do not replace an investment policy. There is no claimed calibration, backtested edge, or automatic rule adjustment.</p><div class="method-grid">${['buy', 'sell'].map(direction => `<div><h3>${direction === 'buy' ? 'Buy strength' : 'Sell strength'}</h3>${data.method[direction].map(f => `<div class="method-row"><span>${escape(f.label)}</span><span class="accent">${f.weight}%</span></div>`).join('')}</div>`).join('')}</div><h3>How to read a grade</h3><ol><li>Choose the same 5-, 10-, or 20-session horizon before comparing instruments.</li><li>0–24: little supporting evidence; 25–49: limited; 50–74: mixed to supportive; 75–100: strong. These are descriptive bands, not action thresholds.</li><li>A low buy grade is not a sell recommendation. Both cases are assessed independently.</li><li>Every factor needs an assessment. Missing inputs are never filled with neutral scores.</li><li>Expired research cannot produce a current grade. A hard buy veto stays visible.</li><li>Related indicators belong in one evidence group to avoid counting the same signal repeatedly.</li><li>Price and source times remain separate from the page refresh time.</li></ol><p>The first version has no historical score series: a current assessment cannot reconstruct what was known in the past. Future history must preserve dated original assessments.</p>`;
}
