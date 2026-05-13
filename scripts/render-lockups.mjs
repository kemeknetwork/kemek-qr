/* Screenshots the live masthead `.brand` element at both light and
 * dark themes and writes the resulting PNGs to `static/brand/`. This
 * guarantees zero drift between the brand kit lockup and the rendered
 * masthead — they're not two implementations of the same design,
 * they're the same pixels.
 *
 * Run when:
 *   - `.brand` / `.brand-mark` / `.brand-name` / `.brand-slash` change
 *     in `src/routes/+layout.svelte`
 *   - `--font-display` / `--accent` / `--ink` / `--paper` tokens change
 *     in `src/app.css`
 *
 * Usage:
 *   1. Start the dev server: `npm run dev` (port 5184)
 *   2. Run: `node scripts/render-lockups.mjs`
 *
 * Requirements: a Chromium-class browser. The script self-discovers
 * Playwright from sibling kemek-* projects to avoid pulling a ~ 200 MB
 * devDep into kemek-qr itself. Env vars `PLAYWRIGHT_MODULE` and
 * `PLAYWRIGHT_CHROMIUM` override the search.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = resolve(import.meta.dirname, '..');
const DEV_URL = process.env.DEV_URL ?? 'http://localhost:5184/';

const PLAYWRIGHT_HUNTS = [
	process.env.PLAYWRIGHT_MODULE,
	resolve(ROOT, 'node_modules/playwright'),
	'/home/kv/dev/projects/kemek-digest/node_modules/playwright',
	'/home/kv/dev/projects/bitcoin-astrolabe/node_modules/playwright'
].filter(Boolean);
const playwrightDir = PLAYWRIGHT_HUNTS.find((p) => existsSync(p));
if (!playwrightDir) {
	console.error(
		'render-lockups: no Playwright install found. Either `npm i -D playwright` here, ' +
			'or set PLAYWRIGHT_MODULE to a path that has it.'
	);
	process.exit(1);
}
const require = createRequire(import.meta.url);
const { chromium } = require(playwrightDir);

const CANDIDATE_CHROMES = [
	process.env.PLAYWRIGHT_CHROMIUM,
	'/tmp/chrome-cft/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser'
].filter(Boolean);
const executablePath = CANDIDATE_CHROMES.find((p) => existsSync(p));

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox'],
	...(executablePath ? { executablePath } : {})
});

async function captureBrand(theme, outRelPath) {
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 4
	});
	const page = await ctx.newPage();
	await page.goto(DEV_URL, { waitUntil: 'networkidle' });
	/* The FOUC firewall in app.html reads localStorage on first paint
	 * and writes data-theme. Set localStorage + reload so the theme
	 * lands before the first stable paint instead of toggling after. */
	await page.evaluate((t) => localStorage.setItem('kemek-qr:theme', t), theme);
	await page.reload({ waitUntil: 'networkidle' });
	/* Strip page + masthead backgrounds so omitBackground actually
	 * yields a transparent capture. The lockup needs to sit on any
	 * surface; we don't want the page's cream/graphite baked in. */
	await page.addStyleTag({
		content: `
			html, body, .masthead, .masthead-inner { background: transparent !important; }
		`
	});
	/* Wait for Fraunces + JetBrains Mono to actually be parsed. */
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(200);

	const elt = page.locator('a.brand').first();
	await elt.screenshot({ path: resolve(ROOT, outRelPath), omitBackground: true });
	console.log(`${outRelPath}: captured (theme=${theme})`);
	await ctx.close();
}

await captureBrand('light', 'static/brand/lockup-light.png');
await captureBrand('dark', 'static/brand/lockup-dark.png');

await browser.close();
console.log('lockup PNGs regenerated (live-masthead capture).');
