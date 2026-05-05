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
	server: {
		port: 5184,
		strictPort: true
	}
});
