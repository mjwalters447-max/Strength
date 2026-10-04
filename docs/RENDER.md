# Render Free deployment

Deploy one Node web service from this repository's `main` branch. This first deployment uses only the built-in fictional demonstration. No research feed, database, disk, worker, scheduled job, or paid resource is required.

## Settings

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node |
| Instance plan | Free |
| Root directory | Repository root (leave blank) |
| Build command | `node --test test/*.test.mjs` |
| Start command | `STRENGTH_ORIGIN="$RENDER_EXTERNAL_URL" node server.mjs` |
| Health check path | `/` |
| Auto-deploy | Off; manual deployments |
| Instances | One |

## Environment

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `24.19.0` (locally verified version) |
| `NODE_ENV` | `production` |
| `STRENGTH_HOST` | `0.0.0.0` |
| `SKIP_INSTALL_DEPS` | `true` (no dependencies to install) |
| `STRENGTH_PASSWORD` | A new random password, at least 16 characters, entered only in Render's secret environment settings |

Use Render's supplied `PORT`. The start command assigns the exact canonical origin from Render's documented `RENDER_EXTERNAL_URL`; it does not guess the assigned hostname. Leave `STRENGTH_SNAPSHOT_PATH` unset for the synthetic preview. Do not reuse the local preview password or test fixture password. Missing or incorrect configuration must not be bypassed by disabling production mode or Host checks. A custom domain would require explicitly updating the canonical origin.

Render terminates HTTPS and redirects HTTP at its edge. The application port is not directly public. Its health probe uses the assigned hostname when no custom domain exists, matching the strict Host validation. No custom domain is needed.

## Acceptance checks after deployment

Confirm the exact source commit and Free plan. Verify a live deployment, HTTP-to-HTTPS redirect, the login page, and a 401 response from `/api/snapshot` before authentication. Then verify valid login, the synthetic-data banner, charts at mobile width, Secure/HttpOnly/SameSite cookie attributes, logout, and rejection of the former session. Inspect deployment errors without exposing secret environment values. Local tests do not substitute for these hosted checks.

Free services sleep after inactivity and may take about a minute to wake. Restarts revoke sessions and reset login throttles. Local file changes are ephemeral; future research persistence needs a separate design. Do not add keep-alive jobs to evade sleep. Keep payment details absent if strict no-overage behavior is desired; recheck provider terms before changing billing.

References: [web services](https://render.com/docs/web-services), [health checks](https://render.com/docs/health-checks), [free limits](https://render.com/docs/free).
