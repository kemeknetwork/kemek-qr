import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
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
		adapter: adapter({ fallback: '404.html' })
	}
};

export default config;
