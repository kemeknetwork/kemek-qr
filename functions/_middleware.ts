/* Server-side page-view counter for kemek-qr.
 *
 * Runs at the Cloudflare edge on every request to the Pages
 * project, BEFORE the static asset is served. Emits one structured
 * JSON log line per page-view via `console.log`; the line lands in
 * the CF Pages deployment tail (free, 7-day retention) and can be
 * streamed live with:
 *
 *   npx wrangler pages deployment tail kemek-qr
 *
 * or read in the CF dashboard under Workers & Pages → kemek-qr →
 * Deployments → (specific deployment) → "Real-time logs".
 *
 * ## Why this exists
 *
 * The Pages "Metrics" tab is Functions-only — a static-only project
 * with no Functions deployed shows zero. The Web Analytics product
 * is beacon-mode (injects a client-side `<script>`), which would
 * contradict the about §02 ¶02 claim of "no third-party scripts on
 * generator pages." This middleware is the workaround: server-side
 * log inspection of aggregate request metadata is exactly what the
 * about §02 ¶01 disclosure already says we do ("We see what our
 * host sees — aggregate pageview counts, no individual tracking,
 * no cookies, no third-party scripts").
 *
 * ## Privacy invariants — do not relax without updating about copy
 *
 * - **No IP capture.** `context.request.headers.get('cf-connecting-ip')`
 *   is intentionally not read or logged.
 * - **No cookies set or read.** Middleware never touches Set-Cookie
 *   or the Cookie header.
 * - **No unique identifier per visitor.** Country and PoP code are
 *   the highest-cardinality fields; both are aggregate populations.
 * - **No client-side code.** Middleware runs server-side; the
 *   visitor's browser sees an identical static response.
 * - **Asset fetches are filtered out.** Only HTML page-view requests
 *   (path with no extension or ending in `.html`) are logged. JS,
 *   CSS, fonts, favicons, sitemap, robots, llms.txt etc. are
 *   excluded so the log is a clean page-view stream.
 *
 * ## Operational cost
 *
 * Middleware adds ~1-3 ms per request (single string concatenation
 * + one structured log line + a no-op pass-through). Acceptable
 * trade for visibility on a pure-static site. Upgrading to KV
 * counter (Tier 2) or Analytics Engine (Tier 3) would land here
 * the same way — extend the inside of the `if (isPageView)` block. */

/* Minimal KV interface — declared inline rather than pulling in
 * @cloudflare/workers-types as a devDep. Only the methods we use. */
type KVNamespace = {
	get: (key: string) => Promise<string | null>;
	put: (key: string, value: string) => Promise<void>;
};

type EventContext = {
	request: Request;
	next: () => Promise<Response>;
	waitUntil: (promise: Promise<unknown>) => void;
	env: {
		/* Bound in the CF dashboard under Workers & Pages →
		 * kemek-qr → Settings → Functions → KV namespace bindings.
		 * Variable name `PV_COUNTER`. Optional — middleware
		 * gracefully no-ops if the binding is absent (the structured
		 * log still emits regardless). */
		PV_COUNTER?: KVNamespace;
	};
};

type CfProperties = {
	country?: string;
	colo?: string;
};

export async function onRequest(context: EventContext): Promise<Response> {
	const url = new URL(context.request.url);
	if (isPageView(url.pathname)) {
		const cf = (context.request as Request & { cf?: CfProperties }).cf;
		console.log(
			JSON.stringify({
				ts: Date.now(),
				path: url.pathname,
				country: cf?.country ?? null,
				colo: cf?.colo ?? null,
				ua: (context.request.headers.get('user-agent') ?? '').slice(0, 120),
				ref: context.request.headers.get('referer') ?? null
			})
		);
		if (context.env.PV_COUNTER) {
			context.waitUntil(incrementCounter(context.env.PV_COUNTER));
		}
	}
	return context.next();
}

/* Best-effort counter. KV writes are eventually consistent and
 * not atomic — two simultaneous reads can both write the same
 * incremented value, losing one count. Acceptable for a decorative
 * "IMPRESSIONS" footer cell where order-of-magnitude is what
 * matters, not precision. Strictly accurate counting would need
 * Durable Objects; that's Tier 3 territory.
 *
 * Errors are swallowed silently — the counter is non-critical and
 * must never block a request or surface a 500 to the visitor. */
async function incrementCounter(kv: KVNamespace): Promise<void> {
	try {
		const current = parseInt((await kv.get('total')) ?? '0', 10);
		await kv.put('total', String(current + 1));
	} catch {
		/* intentional: decorative counter, swallow failures */
	}
}

/* Page-view heuristic — the request hits a route (HTML) rather than
 * an asset (CSS/JS/font/favicon/etc.). True if the trailing path
 * segment has no `.` (treated as a directory or extensionless route)
 * or explicitly ends in `.html`. This intentionally excludes
 * `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/og.png`, the entire
 * `_app/immutable/...` tree, and the favicon family — all of which
 * are asset fetches, not page-views. The 404 SPA fallback at
 * `/404.html` is also a page-view (path ends in .html) so we'll see
 * mis-typed URLs in the log too, which is useful diagnostic data. */
function isPageView(pathname: string): boolean {
	const last = pathname.split('/').pop() ?? '';
	if (!last) return true;
	if (last.endsWith('.html')) return true;
	return !last.includes('.');
}
