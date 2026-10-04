# Market-only snapshot contract

This page describes authored research schema 1. The independent daily-price schema 2 is documented in [CONNECTION.md](CONNECTION.md) and validated by `lib/market.mjs`. Schema 2 cannot carry grades or narratives; it does not repurpose a market chart as a research assessment.

`lib/model.mjs::validateSnapshot` owns the exact contract. Unknown keys are rejected at every accepted nested object. This is validation of a market-only document, not an anonymizer for private documents.

| Object | Required fields |
| --- | --- |
| Root | `schemaVersion: 1`, `mode`, `methodology`, `publishedAt`, `coverage`, `sources`, `markets`, `sectors`, `instruments` |
| Coverage | `universe`, integer `examined`, integer `total`, `note` |
| Source | `id`, `label`, `url` or null, `asOf`, `usage`, `delayMinutes` |
| Market | `id`, `label`, numeric `value`, `unit`, `changePct`, numeric `sparkline`, `sourceId` |
| Sector | `name`, `changePct`, `sourceId` |
| Instrument | `symbol`, `name`, `sector`, `kind`, `currency`, `asOf`, `validUntil`, `sourceIds`, `previousClose`, `bars`, `thesis`, `assessments`, `events` |
| Bar | `date`, `open`, `high`, `low`, `close`, integer `volume` |
| Thesis | `status`, `evidence`, `contrary`, `invalidation` |
| Assessment | `horizon`, `buy`, `sell`, `vetoes` |
| Buy / sell | `thesis`, `structure`, `valuation`, `catalysts`, `execution` |
| Factor | `level` (integer 0–4 or null), `reason` |
| Event | `date`, `title`, `status`, `sourceId` |

Research mode is `research`, source usage is `personal-display`, and the rubric identifier is `strength-0.1-experimental`. Demo mode accepts only synthetic sources. The producer must independently establish permission to use each source; a label cannot grant permission.

Times are explicit UTC instants, calendar dates are `YYYY-MM-DD`, and the UI displays instants in Eastern time. Dates on bars remain session-date labels. Publication cannot precede source availability or the assessment. An assessment cannot incorporate a source timestamp later than its own issue time. Validity must end after the assessment and within seven days. The producer is responsible for choosing a materially appropriate, often much shorter, validity window; seven days is only an input ceiling.

Bars are ascending and unique, with positive OHLC values and nonnegative whole-share volume. High and low must contain open and close. `previousClose` must equal the prior included bar's close, keeping the change calculation and chart consistent. The producer must normalize source sessions, currency, corporate actions and missing bars before submission. The initial viewer does not certify exchange calendars, reconstruct absent sessions, or validate primary-source accuracy. A 20-bar average is calculated from the source's supplied daily history; missing warm-up values remain absent. Chart range buttons select up to 21, 63 or 126 available bars, and the actual range is displayed.

Market and sector `changePct` are percentage points of percentage change (1.2 means +1.2%), not decimal returns. Market units are `points`, `%`, or `USD`. Yield cards display a yield level plus relative percentage change, not basis-point change. All market context refers to its source date, not the browser refresh time.

## Privacy and integrity

Do not include personal identifiers, balances, quantities held, transactions, cost basis, taxes, private record links, credentials, or complete private review text. The research universe must not be selected from personal positions. Author independent research documents upstream of personal decisions.

The validator rejects unknown fields and obvious personal text patterns, but **cannot prove that arbitrary prose contains no private information**. New producers and narratives require review. Password protection does not make a public source repository private. Snapshot files and access files belong outside the source tree, backups and public build artifacts.

Only HTTPS source links without credentials, queries or fragments are accepted. No URLs are fetched by the server. Data is escaped before rendering, and the content security policy disallows external scripts, connections and frames. No raw source or server file is exposed by a directory server.

Publish replacements atomically from a separately authorized producer. On failure the API returns an unavailable state and the browser clears current grades; it never silently falls back to synthetic examples. Original history should be retained privately by the producer before replacing the current snapshot. No producer or history writer is part of this version.
