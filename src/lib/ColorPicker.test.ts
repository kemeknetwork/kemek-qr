import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import ColorPicker from './ColorPicker.svelte';

/* Every picker on the page shares one saved-colors list in storage.
 * Each used to cache its own copy at mount and write that copy back
 * whole, so saving in one picker erased a color another had saved. */
describe('ColorPicker saved colors', () => {
	let target: HTMLElement;

	beforeEach(() => {
		localStorage.clear();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		target.remove();
		document.body.replaceChildren();
	});

	function saveVia(label: string) {
		target.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
		flushSync();
		document.querySelector<HTMLButtonElement>('button[aria-label="Save current color"]')!.click();
		flushSync();
		document.querySelector<HTMLButtonElement>('button[aria-label="Close picker"]')!.click();
		flushSync();
	}

	it("one picker's save keeps a color another picker saved", () => {
		const fg = mount(ColorPicker, {
			target,
			props: { value: '#111111', label: 'Foreground color' }
		});
		const bg = mount(ColorPicker, {
			target,
			props: { value: '#EEEEEE', label: 'Background color' }
		});
		flushSync();

		saveVia('Foreground color');
		saveVia('Background color');

		expect(JSON.parse(localStorage.getItem('kemek-qr:color-saved')!)).toEqual([
			'#EEEEEE',
			'#111111'
		]);
		unmount(fg);
		unmount(bg);
	});
});
