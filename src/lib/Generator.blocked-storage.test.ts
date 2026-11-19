import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Generator from './Generator.svelte';

/* Holds the page's dynamic import of qr-code-styling until the test lets
 * it go, so the first draw lands after the first autosave, as it does
 * when the library arrives later than the one-second save debounce.
 * A hoisted mock's module loads once per file, so the gate can be held
 * only once: this file keeps to the one test that needs it, and the
 * blocked-storage tests that don't live in Generator.autosave.test.ts. */
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

/* The constructor calls update() with no data; a draw is a call with some. */
const draws = () => engine.update?.mock.calls.filter((call) => call[0]?.data).length ?? 0;

/* A browser that blocks site storage makes every save throw. The page
 * works without storage, so that is a note under the buttons, never the
 * PROTOCOL ERROR alert. It once was that alert, and the first draw
 * cleared it, so a library slower than the save debounce erased the
 * only word that this design would be gone after a reload. */
describe('Generator with site storage blocked and a slow QR library', () => {
	let target: HTMLElement;
	let setItem: MockInstance;

	const region = () => target.querySelector('.save-status[role=status]');
	const note = () => region()?.textContent ?? '';

	beforeEach(() => {
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
		expect(note()).toContain("This browser didn't allow saving this design");
		expect(region()).toBe(live);
		expect(target.querySelector('[role=alert]')).toBeNull();

		engine.release();
		await vi.waitFor(() => expect(draws()).toBeGreaterThan(0), { timeout: 5000 });
		flushSync();
		expect(note()).toContain("This browser didn't allow saving this design");
		expect(target.querySelector('[role=alert]')).toBeNull();
		unmount(app);
	});
});
