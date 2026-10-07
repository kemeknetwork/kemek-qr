import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	/* sveltekit() compiles .svelte files and resolves $lib, so component
	 * behaviour (reactive effects, autosave) can be tested in jsdom; the
	 * `browser` condition loads Svelte's client runtime, which `mount`
	 * needs — the default server build refuses to mount. */
	plugins: [sveltekit()],
	resolve: { conditions: ['browser'] },
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		globals: false
	}
});
