/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

/* Offline generation. SvelteKit registers this after the page loads;
 * what is kept and how each request is answered is in $lib/offline.
 *
 * A new build is a new `version`, so the new worker installs into its
 * own cache and waits: no skipWaiting, so an open tab keeps the worker
 * and cache its HTML was built against. Once every tab has closed it
 * activates and deletes the older caches. */
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
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	const strategy = strategyFor(url.pathname, request.mode, KEPT_SET);
	if (strategy === 'page') event.respondWith(page(event, url.pathname));
	else if (strategy === 'cached') event.respondWith(cached(request));
});

async function page(event: FetchEvent, pathname: string): Promise<Response> {
	try {
		const preloaded: Response | undefined = await event.preloadResponse;
		return preloaded ?? (await fetch(event.request));
	} catch {
		const kept = await caches.match(keptPagePath(pathname), { cacheName: CACHE });
		return kept ?? Response.error();
	}
}

async function cached(request: Request): Promise<Response> {
	return (await caches.match(request, { cacheName: CACHE })) ?? fetch(request);
}
