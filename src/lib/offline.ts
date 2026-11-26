/* Offline support: which files the service worker keeps and how it
 * answers each request. Pure, so it tests outside a worker;
 * src/service-worker.ts wires it to the cache and the fetch event. */

/* What one visit leaves behind so the generator works without a
 * connection: the hashed scripts and styles, the Latin subsets of the
 * two self-hosted fonts (other subsets load only for text that needs
 * them; .woff is the pre-woff2 fallback), the icons and manifest the
 * pages link, and every prerendered page. Brand images, the OG card,
 * llms.txt and the sitemap serve other sites and crawlers, not the app,
 * so they stay network-only. */
export function precacheList(
	build: readonly string[],
	files: readonly string[],
	prerendered: readonly string[]
): string[] {
	const app = build.filter((f) => /\.(js|css)$/.test(f) || /-latin-(?!ext)[^/]*\.woff2$/.test(f));
	const icons = files.filter((f) =>
		/^\/(favicon[^/]*\.(png|svg|ico)|apple-touch-icon\.png|site\.webmanifest)$/.test(f)
	);
	return [...app, ...icons, ...prerendered];
}

/* `page`: a navigation. Network first, so every online load still
 * reaches the server — fresh after a deploy, and seen by the page-view
 * middleware exactly as without a worker — and the kept copy answers
 * only when the network fails.
 * `cached`: a kept file, or any hashed build file. Kept files are fixed
 * for the build; a hashed name is its content, so a copy from ANY
 * build's cache is the file. That matters during an update: the page
 * is already the new build (network-first) while the old worker still
 * runs, and the new build's chunks sit in the waiting worker's cache.
 * `network`: anything else, untouched — /api/ included, so the footer's
 * pageview count simply fails offline, as it is built to. */
export type Strategy = 'page' | 'cached' | 'network';

export function strategyFor(
	pathname: string,
	mode: RequestMode,
	kept: ReadonlySet<string>
): Strategy {
	if (pathname.startsWith('/api/')) return 'network';
	if (mode === 'navigate') return 'page';
	if (kept.has(pathname) || pathname.startsWith('/_app/immutable/')) return 'cached';
	return 'network';
}

/* The kept page for an offline navigation. Pages serves about.html at
 * /about and the prerendered list names it that way, so map the other
 * spellings of the same page onto it; the worker redirects to that
 * path rather than answer in place, since the pages load their scripts
 * by relative path. */
export function keptPagePath(pathname: string): string {
	const path = pathname.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path || '/';
}
