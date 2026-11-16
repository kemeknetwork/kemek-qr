import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import QRCodeStyling from 'qr-code-styling';
import Generator from './Generator.svelte';

/* buildOpts must hand the library the UTF-8 byte string, not the text.
 * toQrByteString's own tests stay green if the call site drops it, and
 * every non-ASCII code is then silently corrupted again. */
describe('Generator QR payload', () => {
	let target: HTMLElement;

	beforeEach(() => {
		localStorage.clear();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		target.remove();
	});

	it('hands qr-code-styling the UTF-8 bytes of the text', async () => {
		const update = vi.spyOn(QRCodeStyling.prototype, 'update');
		const app = mount(Generator, { target, props: { type: 'text' } });
		flushSync();
		await vi.waitFor(() => expect(update).toHaveBeenCalled());

		const text = 'Zoë’s café — ✓ 😀 中文';
		const field = target.querySelector<HTMLTextAreaElement>('textarea')!;
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await vi.waitFor(() => expect(update.mock.calls.at(-1)?.[0]?.data).toBeDefined());
		const sent = update.mock.calls.at(-1)![0]!.data!;
		expect([...sent].map((c) => c.charCodeAt(0))).toEqual([...new TextEncoder().encode(text)]);
		unmount(app);
	});
});
