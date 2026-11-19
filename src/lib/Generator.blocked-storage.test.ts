import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Generator from './Generator.svelte';

/* Holds the page's dynamic import of qr-code-styling until a test lets
 * it go, so the first draw can land after the first autosave, as it
 * does when the library arrives later than the one-second save
 * debounce. update is spied once the library loads, so a test waits
 * for a real draw rather than hoping one has happened. */
const engine = vi.hoisted(() => {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	return { gate, release, update: null as MockInstance | null };
});
vi.mock('qr-code-styling', async (importOriginal) => {
	await engine.gate;
	const mod = await importOriginal<typeof import('qr-code-styling')>();
	engine.update = vi.spyOn(mod.default.prototype, 'update');
	return mod;
});

const draws = () => engine.update?.mock.calls.length ?? 0;

/* A browser that blocks site storage makes every save throw. The page
 * works without storage, so that is a note under the buttons, never the
 * PROTOCOL ERROR alert. It once was that alert, and the first draw
 * cleared it, so a library slower than the save debounce erased the
 * only word that this design would be gone after a reload. */
describe('Generator with site storage blocked', () => {
	let target: HTMLElement;
	let setItem: MockInstance;

	const region = () => target.querySelector('.save-status[role=status]');
	const note = () => region()?.textContent ?? '';
	const SAYS = "This browser didn't allow saving this design";

	beforeEach(() => {
		localStorage.clear();
		setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('The operation is insecure.', 'SecurityError');
		});
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		setItem.mockRestore();
		vi.useRealTimers();
		target.remove();
	});

	it('keeps the note through a first draw that lands after the failed save', async () => {
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		const live = region();
		expect(live?.textContent?.trim()).toBe('');

		await vi.advanceTimersByTimeAsync(1500);
		expect(setItem).toHaveBeenCalled();
		expect(draws()).toBe(0);
		expect(note()).toContain(SAYS);
		expect(region()).toBe(live);
		expect(target.querySelector('[role=alert]')).toBeNull();

		engine.release();
		await vi.waitFor(() => expect(draws()).toBeGreaterThan(0));
		flushSync();
		expect(note()).toContain(SAYS);
		expect(target.querySelector('[role=alert]')).toBeNull();
		unmount(app);
	});

	it('keeps the note through later edits, and stops trying to save', async () => {
		engine.release();
		const app = mount(Generator, { target, props: { type: 'url' } });
		flushSync();
		await vi.advanceTimersByTimeAsync(1500);
		expect(note()).toContain(SAYS);
		const saves = setItem.mock.calls.length;
		const before = draws();

		const url = target.querySelector<HTMLInputElement>('input[type=url]')!;
		url.value = 'https://example.com/edited';
		url.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		await vi.advanceTimersByTimeAsync(1500);

		expect(draws()).toBeGreaterThan(before);
		expect(note()).toContain(SAYS);
		expect(setItem.mock.calls.length).toBe(saves);
		unmount(app);
	});
});
