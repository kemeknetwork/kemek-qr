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

	/* Too much text is the visitor's to fix, not a fault: it reads as a
	 * status note, never the PROTOCOL ERROR alert, and download is off
	 * until the code can be drawn. The status region is in place, empty,
	 * before the note fills it: a polite live region that arrives already
	 * filled is often not announced. */
	const region = () => target.querySelector('[role=status]');
	const note = () => region()?.textContent ?? '';
	const download = () => target.querySelector<HTMLButtonElement>('button.download')!;

	it.each(Object.keys(restoreFrom))('draws again once the text fits, after %s', async (source) => {
		restoreFrom[source as keyof typeof restoreFrom]();
		const update = vi.spyOn(QRCodeStyling.prototype, 'update');
		const app = mount(Generator, { target, props: { type: 'text' } });
		flushSync();
		const live = region();
		expect(live?.textContent?.trim()).toBe('');
		await vi.waitFor(() => expect(note()).toContain('Too much content for one QR'));
		expect(region()).toBe(live);
		/* 3000 bytes is past L, so no setting fits it: shortening is the
		 * only fix worth naming. */
		expect(note()).toContain('Shorten it to draw one.');
		expect(target.querySelector('[role=alert]')).toBeNull();
		expect(download().disabled).toBe(true);

		const field = target.querySelector<HTMLTextAreaElement>('textarea')!;
		field.value = 'hi';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await vi.waitFor(() => expect(update.mock.calls.at(-1)?.[0]?.data).toBe('hi'));
		await vi.waitFor(() => expect(note()).not.toContain('Too much content'));
		expect(download().disabled).toBe(false);
		unmount(app);
	});

	/* 2000 bytes overflows H (1273 at version 40) but fits L, so the
	 * note names the second fix, not only shortening. */
	it('names lowering the error correction when that alone would fit it', async () => {
		const atH = { ...tooLong, ecc: 'H' as const, content: { text: 'a'.repeat(2000) } };
		window.location.hash = encodePermalink(atH, 'http://localhost/text').hash;
		const app = mount(Generator, { target, props: { type: 'text' } });
		flushSync();
		await vi.waitFor(() =>
			expect(note()).toContain('Shorten it, or lower the error correction to draw one.')
		);
		unmount(app);
	});
});
