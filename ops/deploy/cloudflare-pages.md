# Deploy: Cloudflare Pages + GoDaddy DNS (interim)

The kemek.com domain stays at GoDaddy for now (umbrella for ~95% of
kVadrum's hosted sites and client work; will migrate later as part of
the composable-stack rebuild). For the time being only `qr.kemek.com`
is delegated outward via a single CNAME — the rest of the domain
keeps working unchanged.

This document covers the one-time setup. Re-deployment is automatic
after step 5: every push to `main` triggers a Pages build.

## Steps

### 1. Cloudflare account

Sign up at cloudflare.com (free). **Do not** add `kemek.com` as a
"site" — that path moves DNS to Cloudflare, which is the
end-state but not now.

### 2. Connect the repo to Pages

- Dashboard → **Workers & Pages** → Create → Pages → **Connect to Git**
- Authorize the `KeMeK-Network` GitHub org (or just the
  `kemek-QR` repo if scoping access narrowly).
- Pick `KeMeK-Network/kemek-QR`. Production branch: **`main`**.
- Framework preset: **SvelteKit**.
- Build command: `npm run build`
- Build output directory: `build`
- Node version: **20** or **22** (set via env var `NODE_VERSION` if Pages doesn't auto-detect).
- Root directory: leave blank (project is at repo root).
- Save and deploy. First build takes ~60s.

A temporary URL is issued — `kemek-qr.pages.dev` or similar.

### 3. Smoke-test the temporary URL

Before pointing the real domain at it, verify on the `*.pages.dev` URL:

- `/`, `/text`, `/wifi`, `/vcard`, `/email`, `/sms`, `/phone`, `/geo`, `/about` all render.
- Any field edit updates the QR preview live (~80ms debounce).
- Downloads work for PNG, SVG, PDF — with frame on and off.
- Permalinks (`COPY LINK` button) round-trip on the same URL.
- localStorage auto-save survives a page reload on each route.
- DevTools network tab on a generator page shows **zero** outbound requests during QR generation (the privacy claim).

### 4. Add the custom domain in Pages

- Pages project → **Custom domains** → Set up a custom domain → enter `qr.kemek.com`.
- Cloudflare detects that the parent domain isn't on its DNS and prompts you to add the record manually. Copy the **CNAME target** it shows — looks like `kemek-qr.pages.dev` or a project-specific subdomain.
- Leave this tab open; status will sit at "Pending DNS" until step 5 lands.

### 5. Add the CNAME at GoDaddy

- GoDaddy → My Products → DNS for `kemek.com`.
- Add a record:
  - **Type:** CNAME
  - **Name / Host:** `qr`
  - **Value / Points to:** the Pages target from step 4 (e.g. `kemek-qr.pages.dev`).
  - **TTL:** 600 seconds (10 min). Don't accept GoDaddy's 1-hour default — keep it short so future migrations are quick.
- Save.

Propagation typically lands in 5–15 minutes.

### 6. Wait for SSL

Back on the Pages custom-domain tab, status should flip from
"Pending DNS" → "Active" once propagation completes. Cloudflare
auto-issues a Let's Encrypt cert; no action needed. If it stalls
beyond ~30 min:

- Verify the CNAME resolves: `dig qr.kemek.com CNAME +short`.
- Check there's no conflicting A record for `qr` at GoDaddy.

### 7. Verify

- `https://qr.kemek.com/` resolves with valid SSL (no browser warnings).
- All 9 routes work.
- `https://qr.kemek.com/og.png` returns 200 (OG scrapers fetch it directly).
- `https://qr.kemek.com/sitemap.xml`, `/robots.txt`, and `/llms.txt` all return 200.
- A scrape preview against an OG validator (e.g. opengraph.xyz, Twitter card validator) shows the drafting-paper card.

### 8. Submit to search engines

- **Google Search Console** (search.google.com/search-console): Add property, verify via DNS TXT (add at GoDaddy) or HTML meta. Submit `https://qr.kemek.com/sitemap.xml`.
- **Bing Webmaster Tools** (bing.com/webmasters): same flow.

### 9. Page-view visibility (via `functions/_middleware.ts`)

The Pages "Metrics" tab is Functions-only — a static-only project with zero Functions deployed shows zero traffic there (this is confirmed in the CF Pages docs; the tab measures Functions executions, not edge asset requests). The standalone "Web Analytics" toggle injects a client-side beacon at deploy time, which would contradict the about §02 ¶02 claim of "no third-party scripts on generator pages."

The chosen workaround: a tiny CF Pages middleware at `functions/_middleware.ts` that emits one structured JSON log line per page-view server-side. Captures `path`, `country`, CF colo, truncated user-agent, and referer — no IP, no cookies, no unique IDs, no client code. Asset fetches (CSS/JS/fonts/favicons/sitemap/robots/llms) are filtered out so the log is a clean page-view stream.

**To stream live logs from your terminal:**

```sh
npx wrangler login                       # one-time browser auth flow
npx wrangler pages deployment tail kemek-qr
```

The tail runs until you Ctrl+C. Each line is the JSON object the middleware emitted, plus the HTTP request/response summary CF wraps it in.

**To inspect logs from the CF dashboard instead:**

Workers & Pages → kemek-qr → Deployments → click into the active deployment → **Real-time logs** panel. Same data, viewable for ~7 days (free-tier retention).

**Aggregating logs manually** (until a Tier 2 KV counter or Tier 3 Analytics Engine setup is added):

```sh
# Save tail output to a file:
npx wrangler pages deployment tail kemek-qr > /tmp/pageviews.jsonl

# Quick stats:
jq -r '.event.request.url' /tmp/pageviews.jsonl | sort | uniq -c | sort -rn  # top paths
jq -r '.event.cf.country' /tmp/pageviews.jsonl | sort | uniq -c | sort -rn   # top countries
```

The middleware also runs on the 404 SPA fallback, so mis-typed URLs appear in the log — useful diagnostic for stale links.

### 10. (Optional) Visible "Pageviews" counter — KV setup

The middleware in step 9 also increments a running page-view counter in KV (Cloudflare's edge key-value store) **if a `PV_COUNTER` binding is configured**. The site's footer renders a `Pageviews: N` cell in the `.colophon-rights` line when `/api/pageviews` returns a numeric count; otherwise it silently hides the cell. This is the visible "you are visitor #N" pattern from the 1990s, now riding on CF edge KV instead of a CGI script.

**One-time setup:**

1. **Create the KV namespace:**

   Either via CLI:

   ```sh
   npx wrangler kv namespace create kemek-qr-pv-counter
   ```

   The output shows a namespace ID. Note it.

   Or via dashboard: Workers & Pages → KV → **Create a namespace** → name `kemek-qr-pv-counter`.

2. **Bind the namespace to the Pages project as `PV_COUNTER`:**

   Workers & Pages → kemek-qr → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**:
   - **Variable name:** `PV_COUNTER` (must match what `_middleware.ts` and `api/pageviews.ts` read)
   - **KV namespace:** the namespace created in step 1

   Save. The binding applies to the **next deployment** — re-trigger the build (push any commit, or click "Retry deployment" on the latest build in the Deployments tab) so the binding takes effect.

3. **Verify:**

   Hit `https://qr.kemek.com/api/pageviews` directly in a browser. After at least one page-view has incremented the counter, the response should be `{"count":N}` where N is some positive integer. The footer's `Pageviews:` cell should appear on the next page load.

   If the response is `{"count":null}`, the binding isn't set or KV is unreachable — re-check step 2.

**KV free-tier ceiling:**

The CF free tier allows 1,000 writes/day across all KV namespaces. Every page-view is one write. For a quiet utility this is plenty; at >1K visitors/day the counter starts silently dropping increments. If kemek-qr ever hits that scale, upgrade paths:

- **Workers Paid plan** ($5/mo) — lifts the KV write ceiling to 1 M/day.
- **CF Analytics Engine** — purpose-built for high-cardinality edge metrics, included in Workers Paid; replace the KV increment in `_middleware.ts` with `env.ANALYTICS.writeDataPoint(...)`.
- **Durable Object counter** — for strictly-accurate atomic counting (KV is eventually consistent so simultaneous reads can both write the same incremented value, losing one count).

Cost-of-counting is real but currently small. The counter is decorative — accurate to order-of-magnitude, not real-time precision. Don't redesign the footer around it.

**Data persistence:**

KV holds pageview history indefinitely. The count is a single key (`total`) holding a stringified integer. Persistence is independent of:

- Deploys, rollbacks, or rebuilds (KV is untouched)
- Code changes (KV is untouched)
- Free-tier write-limit overruns (new writes get rejected; existing data stays)

The count survives **everything except explicit deletion** of the KV namespace, the `total` key, or the CF account. Removing the binding from Pages settings pauses incrementing but data stays in KV; re-add the binding to resume. Repointing the binding to a different namespace appears as a reset but the original data still exists in the original namespace.

For paranoia-grade backups, `npx wrangler kv key get total --namespace-id=<id>` dumps the current value to stdout — trivially scriptable as a daily cron snapshot. Not currently set up; not currently needed.

### 11. (Tip) Test middleware locally before promoting

The `npm run dev` Vite server **does not run `functions/`** — it only serves the SvelteKit routes from `src/`. Middleware logic (page-view counting, KV writes, the impressions endpoint) only activates when CF Pages serves the project, which means production or `wrangler pages dev`.

Before promoting `functions/` changes, run the full CF Pages emulator locally:

```sh
npm run build                                 # build the static artifact
npx wrangler pages dev build                  # boot the Pages emulator
```

`wrangler pages dev` boots a local server that:

- Serves `build/` as static assets
- Executes `functions/_middleware.ts` and any `functions/api/*.ts` handlers
- Honors KV bindings if you pass them: `--kv PV_COUNTER` (creates a local-only KV namespace; data survives across runs in `.wrangler/`)
- Logs `console.log` output to your terminal in real time — same shape as the production deployment tail

`static/_routes.json` decides which requests invoke the Functions at all: pages and `/api/*` do, static assets (`/_app/*`, `/brand/*`, favicons, `robots.txt`, …) don't — 2 invocations per page load instead of ~24.
`wrangler pages dev` honors it, so it is the place to check that a new top-level file in `static/` got its exclude entry.

This would have caught the self-loop bug in 0.26.16 (the `/api/pageviews` endpoint inadvertently being counted as a page-view) before it shipped to production. Worth adding to the pre-promote checklist for any commit touching `functions/`.

## Operational notes

- **No Cloudflare proxy / orange-cloud / WAF / page rules for this subdomain**, because DNS is at GoDaddy. Pages still serves from Cloudflare's global edge — the CDN benefit is intact. The proxy-layer features (rate limiting, bot management, cache rules) require DNS at Cloudflare; deferred.
- **Subdomain-as-zone NS delegation was attempted first and is blocked on the Free/Pro plan** (validation rejects subdomain-only zone adds; that path now requires Business at $200/mo). CNAME-only at GoDaddy is the right call for v1; when `kemek.com` apex eventually migrates to Cloudflare (composable-stack track), `qr.*` inherits zone-level CF features automatically.
- **Atomic deploys** are built in: every `git push` to `main` triggers a build; the new build replaces the old one only on success. Pages keeps every prior build accessible at a unique URL — one click to roll back from the dashboard.
- **PR previews** auto-deploy any branch (including `dev`) at `<branch>.kemek-qr.pages.dev`. Useful for sharing pre-promote work.
- **No environment variables** needed — kemek-qr is fully static, no API keys, no runtime config.
- **Build budget:** Pages free tier allows 500 builds/month. Far more than this project will produce.

## What to do later (not now)

- **Migrate kemek.com nameservers to Cloudflare.** Mostly painless: Cloudflare's "scan existing records" wizard catches almost everything; you confirm and switch nameservers at GoDaddy. The `qr.kemek.com` CNAME survives unchanged. Once migrated, you can orange-cloud the subdomain to gain proxy + WAF + page rules without touching the Pages project. Hold this until the broader composable-stack migration is ready.
- **Do not enable Cloudflare Web Analytics.** Earlier runbook drafts described it as automatic / edge-derived; that turned out to be wrong (verified via CF docs 2026-05-11). The Pages-integrated Web Analytics toggle injects a client-side `<script>` from `static.cloudflareinsights.com` at deploy time — there is no automatic mode for Pages projects. Enabling it would contradict the about §02 ¶02 "no third-party scripts on generator pages" claim. The chosen alternative is the `functions/_middleware.ts` server-side log emitter described in step 9, which gives us page-view visibility without any client code. If we later want a dashboard rather than tail-log inspection, upgrade to CF Analytics Engine ($5/mo Workers Paid plan) — same middleware writes there instead of just `console.log`.

## Rollback

- Bad deploy: Pages dashboard → Deployments → pick a known-good build → "Rollback to this deployment".
- Bad CNAME: remove the GoDaddy record. `qr.kemek.com` resolves to nothing within TTL (10 min). Re-add with corrected target.
- Want to leave Cloudflare entirely: delete the GoDaddy CNAME, delete the Pages project. The build artifact is plain HTML/JS/CSS — drop it on any static host.
