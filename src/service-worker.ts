/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

/* Offline generation. SvelteKit registers this after the page loads;
 * what is kept and how each request is answered is in $lib/offline.
 *
 * A new build is a new `version`, so the new worker installs into its
 * own cache and waits (no skipWaiting) until no tab uses the old one,
 * then activates and deletes the older caches. Meanwhile the old worker
 * keeps the old cache for offline loads, while online loads still come
 * from the network, so a page opened during the wait is already the new
 * build and fetches anything new from the network. */
import { build, files, prerendered, version } from '$service-worker';
import { keptPagePath, precacheList, strategyFor } from '$lib/offline';

const sw = self as unknown as ServiceWorkerGlobalScope;
const PREFIX = 'kemek-qr-';
const CACHE = `${PREFIX}${version}`;
const KEPT = precacheList(build, files, prerendered);
const KEPT_SET = new Set(KEPT);

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(KEPT)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
			}
			/* The browser starts the page's own request while the worker
			 * boots, so network-first costs a visit no extra wait. */
			await sw.registration.navigationPreload?.enable();
			/* Take the tab that installed the first worker, so it works
			 * offline without a reload (its PDF library is fetched only on
			 * first export). An update activates only once no tab uses the
			 * old worker, so this never swaps a tab's worker mid-session. */
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	const strategy = strategyFor(url.pathname, request.mode, KEPT_SET);
	if (strategy === 'page') event.respondWith(page(event, url));
	else if (strategy === 'cached') event.respondWith(cached(request));
});

async function page(event: FetchEvent, url: URL): Promise<Response> {
	try {
		const preloaded: Response | undefined = await event.preloadResponse;
		return preloaded ?? (await fetch(event.request));
	} catch {
		/* Pages loads its scripts by relative path, so /about/ must not
		 * be answered in place: like Pages online, send it to /about. */
		const path = keptPagePath(url.pathname);
		if (path !== url.pathname) return Response.redirect(path + url.search, 308);
		return (await caches.match(path, { cacheName: CACHE })) ?? Response.error();
	}
}

/* Every cache, not just this build's: see `cached` in $lib/offline. */
async function cached(request: Request): Promise<Response> {
	return (await caches.match(request)) ?? fetch(request);
}
