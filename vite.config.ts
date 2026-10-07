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
