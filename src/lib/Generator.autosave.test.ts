import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Generator from './Generator.svelte';
import { DEFAULT_STYLING, decodeSession, encodePermalink, encodeSession } from './permalink';

function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function upload(target: HTMLElement, file: File) {
	const input = target.querySelector<HTMLInputElement>('input[type=file]')!;
	Object.defineProperty(input, 'files', { value: [file], configurable: true });
	input.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
}

const png = (bytes: number) => new File([new Uint8Array(bytes)], 'logo.png', { type: 'image/png' });

/* jsdom decodes no images, so the upload's decode probe is stubbed to
 * succeed; FileReader is jsdom's real one. */
class DecodingImage {
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	set src(_: string) {
		queueMicrotask(() => this.onload?.());
	}
}

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
		expect(target.querySelector('.save-note')).toBeNull();
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

	/* The share link and the saved session only carry LOGO_MIME_TYPES;
	 * a format outside it must be refused at upload, not accepted and
	 * then silently dropped from every link the user copies. */
	it('refuses an image format the permalink decoder would drop', () => {
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		upload(target, new File([new Uint8Array(16)], 'logo.avif', { type: 'image/avif' }));
		expect(target.querySelector('.logo-error')?.textContent).toContain(
			'use a PNG, JPG, WebP or GIF'
		);
		unmount(app);
	});
});

/* A logo is kept for reload in its own storage slot (the session never
 * carries it). */
describe('Generator logo persistence', () => {
	let target: HTMLElement;

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

	it('keeps an uploaded logo across a reload, and CLEAR forgets it', async () => {
		let app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		upload(target, png(2_000));
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
		upload(target, png(300_000));
		await vi.waitFor(() =>
			expect(target.querySelector('.logo-note')?.textContent).toContain('over 190 KB')
		);
		expect(localStorage.getItem('kemek-qr:logo:url')).toBeNull();
		unmount(app);
	});
});

/* Opening a share link shows the sender's design for that visit only.
 * It once replaced the visitor's saved session a second after landing
 * and deleted their saved logo outright, so checking a link you had
 * just copied cost you your own logo. */
describe('Generator share-link visit', () => {
	let target: HTMLElement;
	const MINE = encodeSession({
		...DEFAULT_STYLING,
		type: 'url',
		content: { url: 'https://mine.example/' },
		logoDataUrl: null
	});
	const MY_LOGO = 'data:image/png;base64,AAAA';

	function visit(hash: string) {
		history.replaceState(null, '', `/${hash}`);
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		return app;
	}

	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem('kemek-qr:session:url', MINE);
		localStorage.setItem('kemek-qr:logo:url', MY_LOGO);
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		vi.useRealTimers();
		history.replaceState(null, '', '/');
		target.remove();
	});

	const sharedLink = () =>
		'#' +
		encodePermalink(
			{
				...DEFAULT_STYLING,
				type: 'url',
				content: { url: 'https://sender.example/' },
				logoDataUrl: null
			},
			'https://qr.kemek.com/'
		).hash;

	it("leaves this browser's saved session and logo alone", async () => {
		const app = visit(sharedLink());
		expect(target.querySelector<HTMLInputElement>('input[type=url]')!.value).toBe(
			'https://sender.example/'
		);
		await vi.advanceTimersByTimeAsync(1500);
		expect(localStorage.getItem('kemek-qr:session:url')).toBe(MINE);
		expect(localStorage.getItem('kemek-qr:logo:url')).toBe(MY_LOGO);
		unmount(app);
	});

	it('leaves them alone when the link is broken, too', async () => {
		const app = visit('#s=v1.not-base64!');
		await vi.advanceTimersByTimeAsync(1500);
		expect(localStorage.getItem('kemek-qr:session:url')).toBe(MINE);
		expect(localStorage.getItem('kemek-qr:logo:url')).toBe(MY_LOGO);
		unmount(app);
	});

	it('saves again once the visitor edits the design', async () => {
		const app = visit(sharedLink());
		await vi.advanceTimersByTimeAsync(1500);
		type(target.querySelector<HTMLInputElement>('input[type=url]')!, 'https://edited.example/');
		await vi.advanceTimersByTimeAsync(1500);
		expect(decodeSession(localStorage.getItem('kemek-qr:session:url')!)?.content).toEqual({
			url: 'https://edited.example/'
		});
		unmount(app);
	});

	it('saves the shared design if the visitor edits and then changes back', async () => {
		const app = visit(sharedLink());
		const url = target.querySelector<HTMLInputElement>('input[type=url]')!;
		type(url, 'https://edited.example/');
		await vi.advanceTimersByTimeAsync(1500);
		type(url, 'https://sender.example/');
		await vi.advanceTimersByTimeAsync(1500);
		expect(decodeSession(localStorage.getItem('kemek-qr:session:url')!)?.content).toEqual({
			url: 'https://sender.example/'
		});
		unmount(app);
	});

	it('forgets a logo the visitor uploads and then clears', async () => {
		vi.useRealTimers();
		vi.stubGlobal('Image', DecodingImage);
		const app = visit(sharedLink());
		upload(target, png(2_000));
		await vi.waitFor(() => expect(localStorage.getItem('kemek-qr:logo:url')).not.toBe(MY_LOGO));
		target.querySelector<HTMLButtonElement>('.logo-clear')!.click();
		flushSync();
		expect(localStorage.getItem('kemek-qr:logo:url')).toBeNull();
		vi.unstubAllGlobals();
		unmount(app);
	});
});

/* qr-code-styling has no error path for a logo that won't decode — the
 * preview stays blank and exports never settle. A saved slot or a share
 * link can carry any well-formed data URL, so a logo must decode before
 * it is kept. */
describe('Generator undecodable logo', () => {
	let target: HTMLElement;
	const BROKEN = 'data:image/png;base64,AAAA';
	const GOOD = 'data:image/png;base64,iVBORw0KGgo=';

	class ProbeImage {
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		set src(value: string) {
			queueMicrotask(() => (value === BROKEN ? this.onerror?.() : this.onload?.()));
		}
	}

	beforeEach(() => {
		localStorage.clear();
		vi.stubGlobal('Image', ProbeImage);
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		history.replaceState(null, '', '/');
		target.remove();
	});

	it('drops a saved logo that will not decode, and forgets it', async () => {
		localStorage.setItem('kemek-qr:logo:url', BROKEN);
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		await vi.waitFor(() =>
			expect(target.querySelector('.logo-error')?.textContent).toContain("couldn't be decoded")
		);
		expect(target.querySelector('.logo-clear')).toBeNull();
		expect(localStorage.getItem('kemek-qr:logo:url')).toBeNull();
		unmount(app);
	});

	it("drops a share link's broken logo but keeps the visitor's saved one", async () => {
		localStorage.setItem('kemek-qr:logo:url', GOOD);
		const link = encodePermalink(
			{
				...DEFAULT_STYLING,
				type: 'url',
				content: { url: 'https://x.example/' },
				logoDataUrl: BROKEN
			},
			'https://qr.kemek.com/'
		);
		expect(link.logoDropped).toBe(false);
		history.replaceState(null, '', `/#${link.hash}`);
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		await vi.waitFor(() =>
			expect(target.querySelector('.logo-error')?.textContent).toContain("couldn't be decoded")
		);
		expect(localStorage.getItem('kemek-qr:logo:url')).toBe(GOOD);
		unmount(app);
	});
});
