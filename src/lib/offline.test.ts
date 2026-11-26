import { describe, expect, it } from 'vitest';
import { keptPagePath, precacheList, strategyFor } from './offline';

/* Names as a real build lists them (v1.0.3). */
const BUILD = [
	'/_app/immutable/entry/start.Bx1.js',
	'/_app/immutable/chunks/pdf-lib.C2.js',
	'/_app/immutable/assets/0.D3.css',
	'/_app/immutable/assets/fraunces-latin-wght-normal.ukD16Tqj.woff2',
	'/_app/immutable/assets/fraunces-latin-ext-wght-normal.Ca2vKHc0.woff2',
	'/_app/immutable/assets/fraunces-vietnamese-wght-normal.CnvboYUG.woff2',
	'/_app/immutable/assets/jetbrains-mono-latin-400-normal.V6pRDFza.woff2',
	'/_app/immutable/assets/jetbrains-mono-latin-500-normal.BWZEU5yA.woff2',
	'/_app/immutable/assets/jetbrains-mono-cyrillic-400-normal.BEIGL1Tu.woff2',
	'/_app/immutable/assets/jetbrains-mono-latin-400-normal.Dx9.woff',
	'/_app/version.json'
];
const FILES = [
	'/apple-touch-icon.png',
	'/favicon.ico',
	'/favicon.svg',
	'/favicon-16.png',
	'/favicon-maskable-512.png',
	'/site.webmanifest',
	'/og.png',
	'/llms.txt',
	'/sitemap.xml',
	'/robots.txt',
	'/brand/screenshot-wifi.png',
	'/_headers',
	'/_routes.json'
];
const PAGES = ['/', '/about', '/wifi'];

describe('precacheList', () => {
	const kept = precacheList(BUILD, FILES, PAGES);

	it('keeps the scripts, styles and Latin fonts the app needs', () => {
		expect(kept).toEqual(
			expect.arrayContaining([
				'/_app/immutable/entry/start.Bx1.js',
				'/_app/immutable/chunks/pdf-lib.C2.js',
				'/_app/immutable/assets/0.D3.css',
				'/_app/immutable/assets/fraunces-latin-wght-normal.ukD16Tqj.woff2',
				'/_app/immutable/assets/jetbrains-mono-latin-400-normal.V6pRDFza.woff2',
				'/_app/immutable/assets/jetbrains-mono-latin-500-normal.BWZEU5yA.woff2'
			])
		);
	});

	it('keeps the icons, the manifest and every page', () => {
		expect(kept).toEqual(
			expect.arrayContaining([
				'/apple-touch-icon.png',
				'/favicon.ico',
				'/favicon.svg',
				'/favicon-16.png',
				'/favicon-maskable-512.png',
				'/site.webmanifest',
				...PAGES
			])
		);
	});

	it('leaves other font subsets, .woff, crawler files and brand images to the network', () => {
		for (const skipped of [
			'/_app/immutable/assets/fraunces-latin-ext-wght-normal.Ca2vKHc0.woff2',
			'/_app/immutable/assets/fraunces-vietnamese-wght-normal.CnvboYUG.woff2',
			'/_app/immutable/assets/jetbrains-mono-cyrillic-400-normal.BEIGL1Tu.woff2',
			'/_app/immutable/assets/jetbrains-mono-latin-400-normal.Dx9.woff',
			'/_app/version.json',
			'/og.png',
			'/llms.txt',
			'/sitemap.xml',
			'/robots.txt',
			'/brand/screenshot-wifi.png',
			'/_headers',
			'/_routes.json'
		]) {
			expect(kept).not.toContain(skipped);
		}
	});
});

describe('strategyFor', () => {
	const kept = new Set(precacheList(BUILD, FILES, PAGES));

	it('sends every navigation network-first, kept or not', () => {
		expect(strategyFor('/', 'navigate', kept)).toBe('page');
		expect(strategyFor('/no-such-page', 'navigate', kept)).toBe('page');
	});

	it('never answers /api/, even for a navigation', () => {
		expect(strategyFor('/api/pageviews', 'cors', kept)).toBe('network');
		expect(strategyFor('/api/pageviews', 'navigate', kept)).toBe('network');
	});

	it('answers kept files from the cache and leaves the rest alone', () => {
		expect(strategyFor('/_app/immutable/chunks/pdf-lib.C2.js', 'cors', kept)).toBe('cached');
		expect(strategyFor('/favicon.svg', 'no-cors', kept)).toBe('cached');
		expect(strategyFor('/og.png', 'no-cors', kept)).toBe('network');
	});

	/* During an update the page is the new build while the old worker
	 * runs; the new chunks are in the waiting worker's cache, not this
	 * worker's list, so a hashed name alone must send them to the cache. */
	it('sends a hashed file from another build to the caches too', () => {
		expect(strategyFor('/_app/immutable/chunks/pdf-lib.NEWHASH.js', 'cors', kept)).toBe('cached');
	});
});

describe('keptPagePath', () => {
	it.each([
		['/', '/'],
		['/index.html', '/'],
		['/about', '/about'],
		['/about/', '/about'],
		['/about.html', '/about'],
		['/wifi', '/wifi']
	])('%s → %s', (path, kept) => {
		expect(keptPagePath(path)).toBe(kept);
	});
});
