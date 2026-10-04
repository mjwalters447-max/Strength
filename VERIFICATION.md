# Verification record

## Market connection candidate — 2026-10-04 ET

The market import adds only Strength code, documentation and synthetic tests. The existing private policy companion was independently reread and its branch HEAD remained unchanged. No review task, project instruction, plan, account connection, watchlist or schedule was edited. The runtime has no outbound provider or review API client. Only regular daily market history was read for the independent reference universe; imported prices and the packed configuration remain outside GitHub.

Fresh Node 24.19.0 suite: **31 tests passed**, including all 19 prior tests. Added coverage verifies typed source rejection, unavailable grades, independent measurement arithmetic, exact history-length boundaries, permutation invariance, split-scale invariance, missing/zero data, gap-fill validation before exclusion, unknown fields through every new nested envelope, bounded decompression, contradictory configuration, unauthenticated rejection, source preservation across server recreation and repeated invalid-source recovery. Syntax checks passed for server and browser entry points.

Local browser checks passed at 320, 390, 768 and 1440 widths with no document overflow. The new view was inspected with actual imported history; search/no-results, symbol selection, change sorting, chart range, keyboard bar inspection, methodology, and blank grades were exercised. Browser logs contained no warnings or errors. The first UI-edit command encountered a Python syntax error before any file was written; it was corrected before these checks.

Market mode displays dated, split-adjusted daily-bar values and price-only measurements. It provides no thesis, grade, forecast, current-price promise or calendar certification. Production deployment/readback is a separate acceptance step and must not be inferred from this candidate record.

## Original synthetic prototype — historical record

Date: 2026-10-04 (Eastern time).

## Baseline and changed surface

Implementation is a local source snapshot of Strength `main` at `4eed617220b7241b859435da1bd75bd658b5c986` (Initial commit), not a Git checkout. The original repository contained only `.gitignore`. Its original contents were preserved, with focused exclusions appended for credentials, local inputs and generated artifacts. All other files in this directory are new. No commits, branches, pushes, deployments, review instructions, schedules, financial records or external settings were changed.

## Fresh evidence

- Node.js 24.19.0: `node --test test/*.test.mjs` — **19 tests passed**.
- An exhaustive arithmetic check inside that suite covers all 3,125 complete factor combinations in each direction: **6,250 cases**, using the documented weights and independent integer rounding.
- `node --check server.mjs` and `node --check public/app.js` — passed.
- Real browser acceptance checks with the installed Microsoft Edge through Playwright — passed at widths 320, 390, 768, 1024 and 1440 pixels, with no page overflow, console errors or failed requests.
- Browser interactions exercised password sign-in, protected snapshot access, search and no-match state, instrument selection, unavailable grades, all three horizons, evidence/catalyst tabs, chart ranges, keyboard chart inspection, methodology navigation, mobile navigation and logout.
- The in-app browser was separately signed in and the rendered dashboard was inspected.

## Important boundary checks

The tests verify unknown fields throughout nested data, forbidden text examples, duplicate IDs, invalid bar relationships, conflicting prior close, impossible calendar timestamps, future evidence, contradictory thesis status, missing inputs, zero versus unavailable, exact expiry, source-file replacement and repeated failure/recovery.

Authentication checks cover missing/short configuration, insecure production origin rejection, unauthenticated direct API and source-path access, forged cookies, Host and Origin rejection, session expiry/recovery, logout/replay, repeat login, two failed-login throttle/recovery cycles, spoofed forwarding headers, secure production cookie flags and content security headers.

## First failures and resolutions

- The initial model test failed because the implementation did not yet exist. Implementing the model made it pass.
- The first combined suite had seven failures: the test client's native fetch normalized the Host header, so it could not exercise the proxy-origin contract. The harness was changed to native HTTP requests; the production Host check was retained.
- The bundled Playwright browser binary was unavailable. Tests used the already-installed Edge executable; nothing was installed.
- The first responsive browser check found an eight-pixel overflow at 320 pixels. Minimum track sizing and the narrow-screen grade layout were corrected. All five widths then passed.
- Independent review found that JavaScript could normalize an impossible calendar timestamp. Canonical timestamp round-trip validation and a regression case were added.

## Acceptance status

| Requirement | Status |
| --- | --- |
| Mobile prototype and working chart/research interactions | PASS |
| Server-enforced local password access | PASS |
| Strict market-only input shape and failure behavior | PASS for tested representations; prose still requires review |
| Deterministic experimental grading arithmetic | PASS |
| No private financial data in the supplied sample | PASS; samples are deliberately fictional |
| Hosted HTTPS authentication and infrastructure | UNVERIFIED; hosting intentionally deferred |
| Approved live feed and automatic research publication | NOT CONNECTED |
| Grading's predictive value or investment effectiveness | UNPROVEN |

This is a functioning synthetic-data prototype, not a live market system. Generated access details and browser artifacts are outside the source directory. Source publication and hosting remain subsequent steps after preview review.
