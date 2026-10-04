# Independent market-data connection

## Authority and isolation

The existing analysis owns decisions, plans, original forecasts, strategy, and review schedules. Strength is a consumer of separately retrieved market facts. It has no task reader, policy writer, trading connection, account credential, or return channel to those reviews. Deploying or refreshing Strength cannot change their code or saved configuration. No workflow is instructed to consume Strength's measurements.

The companion repository is a policy/code reference, not a live financial data store. Its empty state is not a research feed. Existing reviews do not supply the prototype's five numerical factors; inventing a translation would create a competing strategy. Therefore the market view supplies **no buy/sell scores, thesis status, or action labels**. A future review mirror needs a separately approved, privacy-reviewed structured export and source evidence. It is not connected by this change.

## First data path

1. On request, retrieve regular-session, split-adjusted daily history from the existing market-data connection for the fixed `reference-16-v1` universe in `lib/market.mjs`. This universe is not derived from positions or personal decisions. No account, balance, transaction, order, watchlist, scanner, or private review read is needed.
2. Save the exact typed history envelope privately outside this source tree. Record retrieval time and requested bounds. Never pass private review prose through a redaction process and assume it is safe.
3. Run `node scripts/prepare-market.mjs <private-input.json> <new-private-output.json>`. It validates source contracts, rejects unknown fields, removes explicitly identified valid gap-fill bars, constructs schema 2, and packages it. It neither downloads nor uploads anything. Invalid input creates no output. Existing output is never overwritten.
4. Merge only the resulting `STRENGTH_SNAPSHOT_B64` and `STRENGTH_REQUIRE_SOURCE=1` into this service's private configuration, preserving the password and other settings. Publish no snapshot or encoded payload to GitHub. Base64/compression is transport, **not encryption**. Render's access controls and HTTPS protect delivery.
5. Redeploy the same approved source. Read back the authenticated snapshot and reconcile values, dates, coverage, and unavailable grades. Configuration survives service restarts; login sessions do not. Future refreshes are explicit updates, not scheduled changes to existing reviews.

This small bounded snapshot is stored in host configuration to avoid adding a paid database. It is not a scalable historical store. The private local input/output preserve the original import for this run. Retain them in private storage; do not expose backups. A future automatic publisher or long-term archive requires a separate design and authorization.

## Schema 2 and measurement semantics

The exact validator is `lib/market.mjs::validateMarketSnapshot`. The envelope accepts only version, fixed market mode/universe, publication time, typed source metadata, and symbol/bar series. Names and sectors derive from the fixed source-code catalog. Coverage derives from accepted series; it is price coverage, not underwriting coverage. Narrative, scores, user identifiers, and source URLs are not accepted anywhere in this envelope.

The importer accepts only explicit `day`, `regular`, and `split` metadata. It verifies every source bar, including bars later excluded as interpolation, before producing a snapshot. The date portion of the provider's midnight UTC daily label is preserved as a **provider daily label**, not misrepresented as a midnight trade. Session calendar certification and official settled-close reconciliation are not claimed. Last trade prices and official close quotes are not spliced into the daily series.

Returns compare closes in one adjusted series; they are price-only, not total returns. Windows count available bars, not certified exchange sessions. The 20-bar average includes the latest bar; the volume comparison excludes it. Missing windows and zero historical mean volume return unavailable, not zero. Gold, bond and sector ETF prices are explicitly labeled proxies, not index levels, yields, credit spreads, or complete sector breadth.

Historical prices remain historical. The display shows bar dates, import time, missing coverage, unknown feed delay, and on-request refresh status. Server time and page refresh never change source dates or create a current grade. Prices alone cannot justify an investment decision.

## Failures, recovery and scope

Only one source is accepted. Invalid packed content, oversized decompression, unknown fields, source contradictions, unsupported modes and conflicting source configurations fail closed. Missing required source stops startup. Failed data reads return 503 without exposing raw source or falling back to demo data. Correcting the private configuration and restarting restores service; unchanged source content produces unchanged measurements.

The public repository contains code, documentation and synthetic tests only. The site remains for the owner's personal display. Existing feed terms and permissions still apply; this implementation does not grant redistribution rights or certify the user's data entitlement. Do not share the password or republish source data.
