import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Generator from './Generator.svelte';
import { decodeSession } from './permalink';

/* The autosave $effect must track every field it persists. It once
 * read `content[type]` only as an object reference, so typing into a
 * content field never re-ran it: the edit was lost on reload unless a
 * styling change happened to trigger a save afterwards. */
describe('Generator session autosave', () => {
	let target: HTMLElement;

	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		vi.useRealTimers();
		target.remove();
	});

	function type(input: HTMLInputElement, value: string) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	it('saves a content-only edit', async () => {
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		/* let the mount-time save of the defaults land first, so the
		 * assertion can only pass if the edit itself triggered a save */
		await vi.advanceTimersByTimeAsync(1500);

		type(target.querySelector<HTMLInputElement>('input[type=url]')!, 'https://example.com/typed');
		await vi.advanceTimersByTimeAsync(1500);

		const raw = localStorage.getItem('kemek-qr:session:url');
		expect(raw).not.toBeNull();
		expect(decodeSession(raw!)?.content).toEqual({ url: 'https://example.com/typed' });
		unmount(app);
	});

	it('saves a nested content edit on a multi-field type', async () => {
		const app = mount(Generator, { target, props: { type: 'wifi' } });
		flushSync();
		await vi.advanceTimersByTimeAsync(1500);

		type(target.querySelector<HTMLInputElement>('input[placeholder="Network name"]')!, 'CafeNet');
		await vi.advanceTimersByTimeAsync(1500);

		const raw = localStorage.getItem('kemek-qr:session:wifi');
		expect(decodeSession(raw!)?.content).toMatchObject({ ssid: 'CafeNet' });
		unmount(app);
	});
});

describe('Generator logo upload', () => {
	let target: HTMLElement;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => target.remove());

	function upload(file: File) {
		const input = target.querySelector<HTMLInputElement>('input[type=file]')!;
		Object.defineProperty(input, 'files', { value: [file], configurable: true });
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	}

	/* The share link and the saved session only carry LOGO_MIME_TYPES;
	 * a format outside it must be refused at upload, not accepted and
	 * then silently dropped from every link the user copies. */
	it('refuses an image format the permalink decoder would drop', () => {
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		upload(new File([new Uint8Array(16)], 'logo.avif', { type: 'image/avif' }));
		expect(target.querySelector('.logo-error')?.textContent).toContain(
			'use a PNG, JPG, WebP or GIF'
		);
		unmount(app);
	});
});

/* A logo is kept for reload in its own storage slot (the session never
 * carries it). jsdom decodes no images, so the upload's decode probe is
 * stubbed to succeed; FileReader is jsdom's real one. */
describe('Generator logo persistence', () => {
	let target: HTMLElement;

	class DecodingImage {
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		set src(_: string) {
			queueMicrotask(() => this.onload?.());
		}
	}

	beforeEach(() => {
		localStorage.clear();
		vi.stubGlobal('Image', DecodingImage);
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		target.remove();
	});

	function upload(bytes: number) {
		const input = target.querySelector<HTMLInputElement>('input[type=file]')!;
		const file = new File([new Uint8Array(bytes)], 'logo.png', { type: 'image/png' });
		Object.defineProperty(input, 'files', { value: [file], configurable: true });
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	it('keeps an uploaded logo across a reload, and CLEAR forgets it', async () => {
		let app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		upload(2_000);
		await vi.waitFor(() =>
			expect(localStorage.getItem('kemek-qr:logo:url')).toMatch(/^data:image\/png;base64,/)
		);
		unmount(app);

		app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		expect(target.querySelector('.logo-clear')).not.toBeNull();
		expect(target.querySelector('.logo-note')).toBeNull();

		target.querySelector<HTMLButtonElement>('.logo-clear')!.click();
		flushSync();
		expect(localStorage.getItem('kemek-qr:logo:url')).toBeNull();
		unmount(app);
	});

	it('says so when a logo is too big to keep, and keeps no stale copy', async () => {
		localStorage.setItem('kemek-qr:logo:url', 'data:image/png;base64,AAAA');
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		upload(300_000);
		await vi.waitFor(() =>
			expect(target.querySelector('.logo-note')?.textContent).toContain('over 190 KB')
		);
		expect(localStorage.getItem('kemek-qr:logo:url')).toBeNull();
		unmount(app);
	});
});
