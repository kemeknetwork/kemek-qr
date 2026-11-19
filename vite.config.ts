import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		/* Build-time injection of the version from package.json so the
		 * colophon EDITION cell prints the live shipped version
		 * without re-importing the whole package.json into the client
		 * bundle. */
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	build: {
		/* The browser floor, and its one canonical home: the oldest
		 * browsers the app is written for. Each number is the newest
		 * feature the app already depends on, not a guess:
		 * String.prototype.toWellFormed (encoders.ts) for Chrome/Edge 111
		 * and Safari 16.4, and `:has()`, which draws the keyboard focus
		 * ring on the radio tabs, for Firefox 121. Vite lowers syntax to
		 * this list but polyfills no API, so a newer API or CSS feature
		 * raises the floor here, in the same commit. Pinned rather than
		 * Vite's default, which moves with each Vite major. */
		target: ['chrome111', 'edge111', 'firefox121', 'safari16.4', 'ios16.4'],
		/* Never inline fonts. Vite base64-inlines assets under 4 KB, which
		 * caught JetBrains Mono's small cyrillic-ext + vietnamese subsets
		 * (and their never-fetched .woff fallbacks) — ~18.5 KB of base64 in
		 * the layout CSS, which svelte.config.js inlines into every HTML
		 * page. As files, a unicode-range subset downloads only when a page
		 * actually uses one of its glyphs. Other assets keep the default. */
		assetsInlineLimit: (filePath) => (/\.woff2?$/.test(filePath) ? false : undefined)
	},
	server: {
		port: 5184,
		strictPort: true
	}
});
