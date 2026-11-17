import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import QRCodeStyling from 'qr-code-styling';
import Generator from './Generator.svelte';

/* A share link is JSON in the URL hash, and JSON can spell half of a
 * surrogate pair (`\ud800`) that no keyboard or TextDecoder produces.
 * encodeURIComponent throws URIError on one, and it ran inside the
 * `encoded` $derived with nothing to catch it, so a crafted email or
 * geo link killed the preview. The escape and the surrogate are built
 * at runtime so no editor or transport can normalise them away. */
const LONE_HIGH = String.fromCharCode(0xd800);
const jsonEscape = (code: number) => String.fromCharCode(92) + 'u' + code.toString(16);

function shareHash(wire: string): string {
	return '#s=v1.' + btoa(wire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

	it.each([
		['email', `{"t":"email","c":{"to":"a${jsonEscape(0xd800)}@b.com","subject":"","body":""}}`],
		['geo', `{"t":"geo","c":{"lat":"1","lon":"2","query":"x${jsonEscape(0xdc00)}y"}}`]
	] as const)('renders a %s link carrying a lone surrogate', async (type, wire) => {
		window.location.hash = shareHash(wire);
		const update = vi.spyOn(QRCodeStyling.prototype, 'update');
		const app = mount(Generator, { target, props: { type } });
		flushSync();

		/* U+FFFD's UTF-8 bytes, percent-encoded: what TextEncoder would
		 * have written for the stray half anyway. A share link is applied
		 * before the instance is built, so its content arrives through the
		 * constructor, which stores the options and calls update() bare;
		 * read them off the instance rather than the call's arguments. */
		await vi.waitFor(() =>
			expect((update.mock.contexts.at(-1) as QRCodeStyling | undefined)?._options.data).toContain(
				'%EF%BF%BD'
			)
		);
		unmount(app);
	});

	it('the fixture really carries a lone surrogate', () => {
		const parsed = JSON.parse(`{"to":"a${jsonEscape(0xd800)}"}`);
		expect(parsed.to).toBe('a' + LONE_HIGH);
		expect(() => encodeURIComponent(parsed.to)).toThrow(URIError);
	});
});
