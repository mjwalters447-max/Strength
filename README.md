# Strength

A private, mobile-friendly market research viewer. Price and volume charts, sector context, independent buy/sell evidence grades, thesis explanations, catalysts, and visible source dates. No trading connection or personal financial data model.

## Current status

Working local prototype with server-enforced password authentication. The default workspace is **entirely synthetic**: fictional issuers, prices, events, and research. No live data provider, task reader, scheduled publisher, or hosted deployment is connected. The experimental grading rubric is not an adopted investment strategy or a proven prediction model.

Node.js 22 or later is required. There are no runtime packages to install, no build step, no external fonts, no analytics, and no external scripts. An existing Node 24 runtime was used for verification.

## Local preview

From this directory:

```sh
node scripts/preview.mjs ../strength-access.private.json
```

This binds only to `127.0.0.1:4173`, creates a random temporary password, and writes the access URL and password to the specified file **outside** the source directory. Choose a new filename if it already exists. Open that file locally to get the password, then visit the URL. The preview does not publish anything. Restarting creates a new password and invalidates prior sessions. On Windows, the access file inherits the parent directory's access controls; keep it in a private user directory.

To run with a password you manage, configure `STRENGTH_PASSWORD` in the process environment using your host's secret settings, then run `node server.mjs`. Minimum password length is 16 characters. Do not put passwords in source files, URLs, shell history, screenshots, or commits.

## Hosting

Render Free is the selected first host. See [deployment settings](docs/RENDER.md). Deployment and the hosted HTTPS boundary remain unverified until the service is created and checked. Static-only hosting does not run the password boundary.

| Variable | Purpose |
| --- | --- |
| `STRENGTH_PASSWORD` | A unique long password supplied through secret configuration |
| `STRENGTH_ORIGIN` | Exact HTTPS origin, such as `https://research.example.com` |
| `NODE_ENV` | Set to `production` for HTTPS-only configuration and secure cookies |
| `STRENGTH_HOST` | Default `127.0.0.1`; set `0.0.0.0` only inside a host-controlled private network |
| `PORT` | Internal HTTP listening port; default 4173 |
| `STRENGTH_SNAPSHOT_PATH` | Optional absolute path to an approved research snapshot outside this source tree |

The reverse proxy must preserve the configured Host, terminate TLS, and prevent direct public access to the HTTP backend. Verify that boundary after choosing hosting. Production configuration alone does not establish deployment security. Use one application instance: session and rate-limit state are in memory. Process restarts revoke sessions and reset throttles. A hosting gateway can provide an additional authentication boundary. No open signup, password-reset flow, or multi-user access is implemented.

## Research data

The server validates a configured file on every snapshot request. The browser refreshes that snapshot once per minute while visible and on demand. It does **not** fetch new market research. A future producer must publish approved snapshots atomically; no producer has been installed or scheduled.

```sh
node scripts/validate.mjs /absolute/path/to/research.json
```

See [the data contract](docs/DATA.md) and [methodology](docs/METHODOLOGY.md). The executable validator in `lib/model.mjs` is the canonical structural contract. `lib/demo.mjs` creates a complete fictional example. Do not relabel that example as real research.

When `STRENGTH_SNAPSHOT_PATH` is configured, invalid, missing, or incomplete files fail closed. The service never substitutes demo data for failed research. Source snapshots remain outside the repository. No personal review text should enter the producer; start with separately authored, market-only research. Source usage labels are declarations and do not independently prove permission or accuracy.

## Verification

```sh
node --test test/*.test.mjs
node --check server.mjs
node --check public/app.js
```

Optional browser acceptance checks use an **already installed** Playwright and browser. Nothing is downloaded automatically:

```sh
node test/browser.mjs /path/to/playwright/index.mjs /private/access.json /private/verification-output
```

Set `STRENGTH_BROWSER_PATH` to an existing browser executable when needed. The checks exercise sign-in/out, search, horizon selection, missing grades, research tabs, keyboard chart inspection, methodology navigation, and viewport widths from 320 to 1440 pixels. The supplied output directory receives synthetic screenshots and test results.

## Scope

Strength is an independent viewer. It does not alter investment policies, existing review schedules, decision ownership, original forecasts, or outcomes. Future integration requires a separately reviewed market-only record and verified data permissions. No source publication or deployment is implied by running this prototype.
