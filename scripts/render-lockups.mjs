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
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const DEV_URL = process.env.DEV_URL ?? 'http://localhost:5184/';

/* Padding (in CSS px) added around the captured `.brand` element on
 * all four sides. Without it, the mark sits flush against the
 * left edge of the PNG and the slash terminals against the right —
 * fine for an in-page DOM context but ugly as a standalone brand
 * asset. The capture is at `scale` × DPR, so we multiply the CSS
 * padding by the same factor when extending the raster. */
const CSS_PADDING = 4;

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

async function captureBrand(theme, outRelPath, scale = 4) {
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: scale
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
	const captureBuffer = await elt.screenshot({ omitBackground: true });
	/* Sharp.extend adds transparent padding around the captured PNG.
	 * Scaling the CSS padding by the same DSF the capture used keeps
	 * the padding proportional. */
	const pad = CSS_PADDING * scale;
	await sharp(captureBuffer)
		.extend({
			top: pad,
			bottom: pad,
			left: pad,
			right: pad,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		})
		.png()
		.toFile(resolve(ROOT, outRelPath));
	console.log(`${outRelPath}: captured (theme=${theme}, padding=${pad}px)`);
	await ctx.close();
}

/* Screen-grade lockups — README header, social cards, in-browser
 * uses. 4 × the native masthead → 752 × 192. Plenty of retina for
 * any reasonable display size. */
await captureBrand('light', 'static/brand/lockup-light.png', 4);
await captureBrand('dark', 'static/brand/lockup-dark.png', 4);

/* Print-grade lockups — banners, posters, anything that gets
 * rasterized at a printer. 32 × the native masthead → ~ 6000 wide
 * (capped by Chrome's canvas-size limits; 32 × is the sweet spot
 * between resolution and "Chrome refuses to allocate"). At 150 DPI
 * this is ~ 40 inches wide; at 100 DPI ~ 60 inches. For posters
 * larger than that, hand the SVG mark to the print shop instead —
 * mark.svg is pure geometry and scales to any size. */
await captureBrand('light', 'static/brand/lockup-light-print.png', 32);
await captureBrand('dark', 'static/brand/lockup-dark-print.png', 32);

await browser.close();
console.log('lockup PNGs regenerated (live-masthead capture).');
