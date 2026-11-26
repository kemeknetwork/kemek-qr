import { describe, expect, it } from 'vitest';
import { isPageView } from '../functions/_middleware';

const headers = (mode?: string) => new Headers(mode ? { 'sec-fetch-mode': mode } : {});

describe('isPageView', () => {
	it('counts a navigation to a page', () => {
		expect(isPageView('/', headers('navigate'))).toBe(true);
		expect(isPageView('/wifi', headers('navigate'))).toBe(true);
		expect(isPageView('/404.html', headers('navigate'))).toBe(true);
	});

	it('counts a page request that names no fetch mode, as before (curl, crawlers)', () => {
		expect(isPageView('/', headers())).toBe(true);
	});

	/* The offline service worker keeps a copy of every page; its
	 * background fetches are not views. */
	it('does not count a browser fetch of a page that is not a navigation', () => {
		expect(isPageView('/', headers('cors'))).toBe(false);
		expect(isPageView('/about', headers('same-origin'))).toBe(false);
	});

	it('does not count assets or the API', () => {
		expect(isPageView('/_app/immutable/chunks/x.js', headers('no-cors'))).toBe(false);
		expect(isPageView('/favicon.svg', headers())).toBe(false);
		expect(isPageView('/api/pageviews', headers('navigate'))).toBe(false);
	});
});
