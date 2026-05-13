/* Regenerates the static raster image kit from the SVG masters.
 * Run: `npm run build:images`. Re-run whenever favicon.svg or og.svg
 * change. The PNG outputs and favicon.ico are committed because
 * platforms (iOS, OG scrapers, legacy IE/Edge, Windows pinned tiles)
 * don't all accept SVG. */

import sharp from 'sharp';
import toIco from 'to-ico';
import { readFile, writeFile } from 'node:fs/promises';

const FAVICON_SVG = await readFile('static/favicon.svg');
const FAVICON_MASKABLE_SVG = await readFile('static/favicon-maskable.svg');
const OG_SVG = await readFile('static/og.svg');
const BRAND_MARK_SVG = await readFile('static/brand/mark.svg');

/* sharp's `density` controls SVG-to-raster DPI. We use a high value
 * for small icons so the resize step gets crisp pixels rather than
 * blurry resampling from a low-DPI rasterization. */
async function rasterize(svg, size, dest) {
	await sharp(svg, { density: Math.max(300, size * 4) })
		.resize(size, size)
		.png()
		.toFile(dest);
}

/* OG card stays at native dimensions (1200×630). */
await sharp(OG_SVG, { density: 144 }).png().toFile('static/og.png');

/* Standard favicon sizes for the modern + legacy fleet. */
await rasterize(FAVICON_SVG, 16, 'static/favicon-16.png');
await rasterize(FAVICON_SVG, 32, 'static/favicon-32.png');
await rasterize(FAVICON_SVG, 180, 'static/apple-touch-icon.png');
await rasterize(FAVICON_SVG, 192, 'static/favicon-192.png');
await rasterize(FAVICON_SVG, 512, 'static/favicon-512.png');

/* Maskable variant for Android adaptive icons. The mark sits inside
 * the 80% safe zone with paper bg filling the rest, so any device-
 * chosen mask shape (circle / squircle / square / teardrop) leaves
 * the mark intact. Declared in site.webmanifest with purpose:
 * "maskable" alongside the "any" entries. */
await rasterize(FAVICON_MASKABLE_SVG, 192, 'static/favicon-maskable-192.png');
await rasterize(FAVICON_MASKABLE_SVG, 512, 'static/favicon-maskable-512.png');

/* favicon.ico — bundle 16 + 32 + 48 so legacy browsers and Windows
 * pinning all pick a sharp size. to-ico accepts an array of PNG
 * buffers and emits a single multi-resolution ICO. */
const ico16 = await sharp(FAVICON_SVG, { density: 600 }).resize(16, 16).png().toBuffer();
const ico32 = await sharp(FAVICON_SVG, { density: 600 }).resize(32, 32).png().toBuffer();
const ico48 = await sharp(FAVICON_SVG, { density: 600 }).resize(48, 48).png().toBuffer();
await writeFile('static/favicon.ico', await toIco([ico16, ico32, ico48]));

/* Brand-kit mark rasters — high-res PNGs for press, social, and
 * partner usage. The SVG master in static/brand/mark.svg is the
 * source of truth and scales to any size (it's pure geometry —
 * rects + paths, no font dependency); the PNGs below are
 * convenience exports for raster-only workflows. 4096 covers
 * grand-format print needs (~ 13.6 in at 300 DPI, or feet of
 * banner at lower DPIs); for anything bigger, hand the SVG to the
 * print shop. */
for (const size of [256, 512, 1024, 2048, 4096]) {
	await rasterize(BRAND_MARK_SVG, size, `static/brand/mark-${size}.png`);
}

/* Lockup PNGs (lockup-light.png / lockup-dark.png) need Fraunces
 * loaded to render the wordmark correctly. sharp can't load web
 * fonts; running this script with sharp would produce a Georgia /
 * serif fallback that drifts from the live masthead.
 *
 * Run `scripts/render-lockups.mjs` separately when the lockup SVGs
 * change — it uses Playwright + the bundled Fraunces from
 * `node_modules/@fontsource-variable/fraunces/` to bake the
 * canonical wordmark into the PNG. Not chained here because it
 * requires Chrome + Playwright. */

console.log('static images regenerated.');
