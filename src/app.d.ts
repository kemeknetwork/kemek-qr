declare global {
	namespace App {}
	/* Injected at build time by vite.config.ts from package.json. */
	const __APP_VERSION__: string;
}

export {};
