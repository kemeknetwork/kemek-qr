/* GET /api/pageviews — returns the running page-view counter for
 * the footer "Pageviews" cell.
 *
 * The counter is maintained by `functions/_middleware.ts` (writes
 * to the same KV namespace bound as `PV_COUNTER`). This endpoint is
 * the read side. Always returns HTTP 200 with a JSON body — never
 * throws into the client — so the footer can silently hide the
 * cell when the binding isn't configured or KV is unreachable.
 *
 * Response shape:
 *   { count: number }   — KV bound and readable
 *   { count: null }     — binding missing or read failed
 *
 * Cache headers: 60 s public + s-maxage so CF's edge can serve
 * subsequent hits without re-reading KV every time. Visitor's
 * browser also caches for 60 s. Net effect: at most one KV read
 * per minute per PoP, regardless of traffic. Counter is decorative,
 * not real-time — a 60 s lag is invisible to humans. */

type KVNamespace = {
	get: (key: string) => Promise<string | null>;
};

type EventContext = {
	env: {
		PV_COUNTER?: KVNamespace;
	};
};

export async function onRequestGet(context: EventContext): Promise<Response> {
	const headers = {
		'cache-control': 'public, max-age=60, s-maxage=60',
		'content-type': 'application/json; charset=utf-8'
	};
	if (!context.env.PV_COUNTER) {
		return new Response(JSON.stringify({ count: null }), { headers });
	}
	try {
		const raw = await context.env.PV_COUNTER.get('total');
		const count = raw === null ? 0 : parseInt(raw, 10);
		return new Response(JSON.stringify({ count }), { headers });
	} catch {
		return new Response(JSON.stringify({ count: null }), { headers });
	}
}
