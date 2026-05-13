/* Rasterizes the brand lockup SVGs with Fraunces 500 loaded so the
 * wordmark in the PNG matches the live masthead exactly. sharp can't
 * load web fonts; this script uses Playwright + the bundled Fraunces
 * from `node_modules/@fontsource-variable/fraunces/` to bake the
 * font into the output. Run when:
 *
 *   - `static/brand/lockup-{light,dark}.svg` changes
 *   - `node_modules/@fontsource-variable/fraunces/` updates
 *
 * Usage: `node scripts/render-lockups.mjs`
 *
 * Requirements: a Chromium-class browser (Chrome / Chromium /
 * Chrome-for-Testing) on the system. Edit `EXECUTABLE_PATH` if the
 * default discovery doesn't find one. The script does no fallback
 * to sharp because the whole point is the font fidelity.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = resolve(import.meta.dirname, '..');
/* Load the opsz subset (weight + optical-size axes) so the SVG can
 * pin `font-variation-settings: 'opsz' 14` regardless of the rendered
 * size. Without this, Fraunces auto-opsz drives stroke weight from
 * font-size — fine at masthead-native size, but a brand kit asset
 * needs to render with the same small-opsz character at any display
 * size, otherwise the README header reads thinner than the live
 * masthead. */
const FRAUNCES_CSS = resolve(ROOT, 'node_modules/@fontsource-variable/fraunces/full.css');

/* Resolve `playwright` from any sibling project that already has it
 * installed (the workspace pattern is to share a single Playwright
 * install across kemek-* projects rather than pull ~ 200 MB of
 * browsers into every node_modules). Falls back to `playwright`
 * resolved from this project's node_modules if it ever gets added
 * as a local devDep. */
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

/* Use whatever Chromium binary the host already has. Playwright will
 * use its default if `executablePath` is undefined. */
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

async function renderLockup(svgRelPath, outRelPath) {
	const svgSrc = await readFile(resolve(ROOT, svgRelPath), 'utf8');
	const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @import 'file://${FRAUNCES_CSS}';
  html, body { margin: 0; padding: 0; background: transparent; }
  body { display: inline-block; }
  svg { display: block; }
</style>
</head><body>${svgSrc}</body></html>`;

	/* The lockup SVG is masthead-native size (172 × 32). Render at
	 * deviceScaleFactor 4 → ~ 688 × 128 native PNG, which is 2 × retina
	 * for the README's `width="320"` display target. Rendering at this
	 * pixel scale keeps Fraunces's `font-optical-sizing: auto` picking
	 * the same small-optical cut as the live masthead — at much larger
	 * canvas sizes the variable font shifts to a display-weight cut
	 * with thinner strokes. */
	const ctx = await browser.newContext({
		viewport: { width: 240, height: 64 },
		deviceScaleFactor: 4
	});
	const page = await ctx.newPage();
	await page.setContent(html, { waitUntil: 'networkidle' });
	/* Wait for the woff2 to actually be parsed + applied. Without
	 * this the SVG may rasterize against the system serif fallback
	 * even though the @font-face declaration has loaded. */
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(200);

	const elt = page.locator('svg').first();
	await elt.screenshot({ path: resolve(ROOT, outRelPath), omitBackground: true });
	console.log(`${outRelPath}: rendered`);
	await ctx.close();
}

await renderLockup('static/brand/lockup-light.svg', 'static/brand/lockup-light.png');
await renderLockup('static/brand/lockup-dark.svg', 'static/brand/lockup-dark.png');

await browser.close();
console.log('lockup PNGs regenerated.');
