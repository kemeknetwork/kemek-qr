import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import QRCodeStyling from 'qr-code-styling';
import Generator from './Generator.svelte';
import { DEFAULT_STYLING, encodePermalink, encodeSession } from './permalink';

/* Text past a QR code's capacity makes qr-code-styling throw, and it
 * throws from its constructor too. The preview's instance was built
 * from the restored content, so a share link or a saved session holding
 * such text left it null, and every later edit bailed out before
 * drawing: the preview stayed dead, and the link re-applied on reload.
 * 3000 bytes is past version 40 at every error-correction level. */
const tooLong = {
	...DEFAULT_STYLING,
	type: 'text' as const,
	content: { text: 'a'.repeat(3000) }
};

const restoreFrom = {
	'a share link': () => {
		window.location.hash = encodePermalink(tooLong, 'http://localhost/text').hash;
	},
	'a saved session': () => {
		localStorage.setItem('kemek-qr:session:text', encodeSession(tooLong));
	}
};

describe('Generator restoring text too long for any QR code', () => {
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

	it.each(Object.keys(restoreFrom))('draws again once the text fits, after %s', async (source) => {
		restoreFrom[source as keyof typeof restoreFrom]();
		const update = vi.spyOn(QRCodeStyling.prototype, 'update');
		const app = mount(Generator, { target, props: { type: 'text' } });
		flushSync();
		await vi.waitFor(() =>
			expect(target.textContent).toContain('too much content for one QR code')
		);

		const field = target.querySelector<HTMLTextAreaElement>('textarea')!;
		field.value = 'hi';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await vi.waitFor(() => expect(update.mock.calls.at(-1)?.[0]?.data).toBe('hi'));
		await vi.waitFor(() =>
			expect(target.textContent).not.toContain('too much content for one QR code')
		);
		unmount(app);
	});
});
