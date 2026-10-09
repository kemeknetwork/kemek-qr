/* Server-side page-view counter for kemek-qr.
 *
 * Runs at the Cloudflare edge before the response for every page and
 * `/api/*` request. Static assets never reach it: `static/_routes.json`
 * excludes them, so a page load costs 2 Function invocations instead
 * of ~24 against the free tier's daily cap. A new top-level file in
 * `static/` needs an exclude entry there, or it costs an invocation
 * (behaviour is unaffected — `isPageView` still passes it through).
 * Emits one structured
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
 * - **No raw IP at rest.** The IP is read transiently in-memory to
 *   compute the rate-limit fingerprint (SHA-256 of `ip|ua|daySalt`),
 *   then discarded. Only the hash is stored — as the key of a
 *   60-second entry in Cloudflare's edge cache, local to one data
 *   centre and never replicated — with a daily-rotating salt so the
 *   hash space is non-correlatable across days. Never logged, never
 *   returned, never leaked downstream; KV holds only the total.
 * - **No cookies set or read.** Middleware never touches Set-Cookie
 *   or the Cookie header.
 * - **No unique identifier per visitor.** Country and PoP code are
 *   the highest-cardinality logged fields; both are aggregate
 *   populations. The rate-limit fingerprint is a hash, expires in
 *   60 s, and is not joined with any logged field.
 * - **No client-side code.** Middleware runs server-side; the
 *   visitor's browser sees an identical static response.
 * - **Asset fetches are filtered out.** Only HTML page-view requests
 *   (path with no extension or ending in `.html`) are logged. JS,
 *   CSS, fonts, favicons, sitemap, robots, llms.txt etc. are
 *   excluded so the log is a clean page-view stream.
 *
 * ## Operational cost
 *
 * Non-page requests pay one path check and a pass-through. A page
 * view adds one structured log line; everything else — the hash, the
 * cooldown check and the KV increment — runs after the response via
 * waitUntil, so nothing on the HTML's TTFB waits on crypto, cache or
 * KV (ADR-0009, superseding ADR-0002's awaited cooldown read). A
 * counted view costs one KV read + one KV write. Analytics Engine
 * (Tier 3) would land the same way — inside the `if (isPageView)`
 * block. */

/* Minimal KV interface — declared inline rather than pulling in
 * @cloudflare/workers-types as a devDep. Only the methods we use. */
type KVNamespace = {
	get: (key: string) => Promise<string | null>;
	put: (key: string, value: string) => Promise<void>;
};

/* Pageview rate-limit cooldown window. A given (ip, ua) tuple
 * increments the counter at most once per COOLDOWN_SECONDS. Set
 * generously enough that a normal visitor reload doesn't get
 * double-counted, tight enough that a curl flood is throttled to
 * ~1 increment per minute per fingerprint. Combined with daily
 * salt rotation, a flooder can't accumulate state across days. */
const COOLDOWN_SECONDS = 60;

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
				/* Cap referer at twice the UA budget — referers tend
				 * toward longer URLs (full path + query string). A
				 * hostile client can otherwise set an arbitrarily-large
				 * Referer (CF allows tens of KB) and pollute the log
				 * line, burning the 7-day Pages tail retention window. */
				ref: (context.request.headers.get('referer') ?? '').slice(0, 240) || null
			})
		);
		const kv = context.env.PV_COUNTER;
		/* Counting never delays or fails the page: it runs after the
		 * response, and the catch keeps a cache or KV outage (e.g. the
		 * 2026-05-20 KV 1006 incident) out of the deployment tail as
		 * well as away from the visitor. Worst case: a missed bump. */
		if (kv) context.waitUntil(countPageView(context.request, kv).catch(() => {}));
	}
	return context.next();
}

/* Bump the counter at most once per fingerprint per COOLDOWN_SECONDS.
 * The cooldown marker lives in the Cache API (free, sub-ms, per data
 * centre) instead of KV, which halves the KV writes per counted view
 * against the free tier's 1,000/day. Per-data-centre scope only lets a
 * visitor whose requests land on two data centres within a minute
 * count twice — KV's ~60 s propagation already allowed the same. The
 * key sits on the request's own origin so it stays in this zone's
 * cache; nothing serves that path to the public.
 *
 * Mark before incrementing: the second of two concurrent first
 * requests is likelier to see the marker. Two can still race past
 * the check together, as with the KV marker before it. */
async function countPageView(request: Request, kv: KVNamespace): Promise<void> {
	const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
	const ua = request.headers.get('user-agent') ?? '';
	const daySalt = Math.floor(Date.now() / 86_400_000).toString();
	const fingerprint = await sha256Hex(`${ip}|${ua}|${daySalt}`);
	const cooldownKey = new Request(new URL(`/__pv-cooldown/${fingerprint}`, request.url));
	/* Workers' CacheStorage has a `default` cache the DOM type lacks. */
	const cache = (caches as unknown as { default: Cache }).default;
	if (await cache.match(cooldownKey)) return;
	await cache.put(
		cooldownKey,
		new Response('1', { headers: { 'cache-control': `max-age=${COOLDOWN_SECONDS}` } })
	);
	await incrementCounter(kv);
}

/* SHA-256 → lowercase hex. Used by the pageview rate-limit
 * fingerprint above. crypto.subtle is available in the Cloudflare
 * Workers runtime (and in modern browsers, though this code never
 * runs there). */
async function sha256Hex(s: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
	return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/* Best-effort counter. KV writes are eventually consistent and
 * not atomic — two simultaneous reads can both write the same
 * incremented value, losing one count. Acceptable for a decorative
 * "Pageviews" footer cell where order-of-magnitude is what
 * matters, not precision. Strictly accurate counting would need
 * Durable Objects; that's Tier 3 territory.
 *
 * Runs inside waitUntil, whose caller swallows failures — the
 * counter is non-critical and must never surface to the visitor. */
async function incrementCounter(kv: KVNamespace): Promise<void> {
	const current = parseInt((await kv.get('total')) ?? '0', 10);
	await kv.put('total', String(current + 1));
}

/* Page-view heuristic — the request hits a route (HTML) rather than
 * an asset (CSS/JS/font/favicon/etc.) or an API endpoint. True if the
 * trailing path segment has no `.` (treated as a directory or
 * extensionless route) or explicitly ends in `.html`, AND the path
 * doesn't sit under `/api/`. Intentionally excludes `/llms.txt`,
 * `/robots.txt`, `/sitemap.xml`, `/og.png`, the entire
 * `_app/immutable/...` tree, the favicon family, and the
 * `/api/pageviews` endpoint (which is fetched by the footer cell
 * on every page mount — would otherwise self-loop and inflate the
 * counter ~1 per unique visitor per minute). The 404 SPA fallback
 * at `/404.html` IS a page-view (path ends in .html) so we'll see
 * mis-typed URLs in the log too, which is useful diagnostic data. */
function isPageView(pathname: string): boolean {
	if (pathname.startsWith('/api/')) return false;
	const last = pathname.split('/').pop() ?? '';
	return !last.includes('.') || last.endsWith('.html');
}
