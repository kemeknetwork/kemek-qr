import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries (node_modules
		// keeps legacy-store semantics so older Svelte 4 deps still compile).
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// `fallback: '404.html'` emits build/404.html containing the SPA
		// shell. Cloudflare Pages auto-serves this file with HTTP 404 for
		// any unmatched path, rather than the default behavior of serving
		// index.html with 200 (which would let typos and stale links
		// silently appear as duplicate-content for the homepage).
		// SvelteKit's router runs in the shell and renders +error.svelte
		// for the actual UI.
		adapter: adapter({ fallback: '404.html' }),
		// Inline per-route CSS chunks ≤50 KB (raw, not gzipped) into <head>.
		// Critical-path audit identified 3 render-blocking CSS files on the
		// LCP path at 522-672 ms each. Lighthouse reports gzipped sizes
		// (19/7/2.6 KB) but Vite/SvelteKit measure raw bytes — actual files
		// are 40/34/8 KB, so threshold sits above the largest at 50_000.
		// Removes those RTTs so the masthead pill paints immediately. Cost
		// is ~50 KB raw added to HTML (gzipped ~10 KB), edge-cached by CF.
		inlineStyleThreshold: 50_000
	}
};

export default config;
