import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import QRCodeStyling from 'qr-code-styling';
import Generator from './Generator.svelte';
import { DEFAULT_STYLING, decodePermalink, encodePermalink } from './permalink';
import type { ContentMap, ContentType } from './types';

/* A share link is JSON in the URL hash, and JSON can spell half of a
 * surrogate pair (`\ud800`) that no keyboard or TextDecoder produces.
 * encodeURIComponent throws URIError on one, and it ran inside the
 * `encoded` $derived with nothing to catch it, so a crafted email or
 * geo link killed the preview. The surrogate is built at runtime so no
 * editor or transport can normalise it away; JSON.stringify writes it
 * as the `\ud800` escape a crafted link would carry. */
const LONE_HIGH = String.fromCharCode(0xd800);
const LONE_LOW = String.fromCharCode(0xdc00);

function shareHash<T extends ContentType>(type: T, content: ContentMap[T]): string {
	const state = { ...DEFAULT_STYLING, type, content, logoDataUrl: null };
	return '#' + encodePermalink(state, 'https://qr.kemek.com/').hash;
}

const LINKS = {
	email: shareHash('email', { to: `a${LONE_HIGH}@b.com`, subject: '', body: '' }),
	geo: shareHash('geo', { lat: '1', lon: '2', query: `x${LONE_LOW}y` })
};

describe('Generator with a malformed share link', () => {
	let target: HTMLElement;

	beforeEach(() => {
		localStorage.clear();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		window.location.hash = '';
		target.remove();
	});

	it.each(['email', 'geo'] as const)(
		'renders a %s link carrying a lone surrogate',
		async (type) => {
			window.location.hash = LINKS[type];
			const update = vi.spyOn(QRCodeStyling.prototype, 'update');
			const app = mount(Generator, { target, props: { type } });
			flushSync();

			/* U+FFFD's UTF-8 bytes, percent-encoded: what TextEncoder would
			 * have written for the stray half anyway. */
			await vi.waitFor(() => expect(update.mock.calls.at(-1)?.[0]?.data).toContain('%EF%BF%BD'));
			unmount(app);
		}
	);

	it('the fixtures really carry a lone surrogate', () => {
		const email = decodePermalink(LINKS.email)?.content as ContentMap['email'];
		const geo = decodePermalink(LINKS.geo)?.content as ContentMap['geo'];
		expect(email.to).toBe(`a${LONE_HIGH}@b.com`);
		expect(geo.query).toBe(`x${LONE_LOW}y`);
		expect(() => encodeURIComponent(email.to)).toThrow(URIError);
		expect(() => encodeURIComponent(geo.query)).toThrow(URIError);
	});
});
