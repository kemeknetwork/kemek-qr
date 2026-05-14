/* Regenerates the static raster image kit from the SVG masters.
 * Run: `npm run build:images`. Re-run whenever favicon.svg, the
 * brand-kit lockup, or the canonical site URL change. The PNG
 * outputs, favicon.ico, AND og.svg are committed because platforms
 * (iOS, OG scrapers, legacy IE/Edge, Windows pinned tiles) don't
 * all accept SVG, and treating og.svg as a build artifact keeps it
 * in lockstep with `static/brand/lockup-dark-outlined.svg` + a real
 * QR code for the canonical URL. */

import sharp from 'sharp';
import toIco from 'to-ico';
import QRCode from 'qrcode';
import { readFile, writeFile } from 'node:fs/promises';

const FAVICON_SVG = await readFile('static/favicon.svg');
const FAVICON_MASKABLE_SVG = await readFile('static/favicon-maskable.svg');
const BRAND_MARK_SVG = await readFile('static/brand/mark.svg');

/* OG card composition. Read the canonical Fraunces-outlined lockup
 * from the brand kit (font-independent: every glyph is an explicit
 * <path> via opentype.js extraction; see
 * scripts/render-lockups-outlined.mjs) and a real QR matrix for the
 * canonical URL, then emit the composed og.svg. This replaces a
 * hand-coded mark + Georgia-fallback wordmark + fake-mosaic "SCAN
 * ME" tile that drifted away from the live brand. */
const CANONICAL_URL = 'https://qr.kemek.com';

const LOCKUP_DARK_OUTLINED = (await readFile('static/brand/lockup-dark-outlined.svg', 'utf8'))
	/* Extract the <svg>'s inner content. The lockup's own viewBox is
	 * 196 × 53; we re-host it inside the OG card via a wrapping <g>
	 * with translate + scale, no need for the outer <svg>. */
	.replace(/^[\s\S]*?<svg[^>]*>/, '')
	.replace(/<\/svg>\s*$/, '')
	/* The brand-kit dark-outlined lockup ships mark + slash in
	 * #c53a1f (light-mode accent). On the OG card's graphite ground
	 * the slightly brighter dark-mode accent #e0492c reads with
	 * more presence, matching the rest of the card's accent usage. */
	.replaceAll('#c53a1f', '#e0492c');

const QR = (() => {
	const qr = QRCode.create(CANONICAL_URL, { errorCorrectionLevel: 'M' });
	const { size, data } = qr.modules;
	return { size, data };
})();

/* Render the QR matrix as a compact SVG <path> made of unit cells.
 * Each filled module emits `M x y h1 v1 h-1 z`. Caller wraps the
 * path in a translated/scaled <g>. */
function qrPath() {
	const { size, data } = QR;
	const parts = [];
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (data[y * size + x]) parts.push(`M${x} ${y}h1v1h-1z`);
		}
	}
	return parts.join('');
}

const OG_CARD_W = 1200;
const OG_CARD_H = 630;

/* Right-side specimen card — the QR's home. 195×470 at (925,80).
 * Cell size 5 px, 4-module quiet zone — 25*5 + 2*4*5 = 165 total.
 * 15 px margins inside the 195-wide card. */
const QR_CELL = 5;
const QR_PAD = 4; // quiet zone, in modules
const QR_INNER_PX = QR.size * QR_CELL; // 125
const QR_TILE_PX = QR_INNER_PX + 2 * QR_PAD * QR_CELL; // 165
const QR_CARD_X = 15; // (195 - 165) / 2
const QR_CARD_Y = 195; // sits below the centered "01" plate marker

const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OG_CARD_W} ${OG_CARD_H}" width="${OG_CARD_W}" height="${OG_CARD_H}">
	<defs>
		<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
			<circle cx="7" cy="7" r="1.4" fill="#f9eedb" opacity="0.04"/>
		</pattern>
	</defs>
	<rect width="${OG_CARD_W}" height="${OG_CARD_H}" fill="#100e09"/>
	<rect width="${OG_CARD_W}" height="${OG_CARD_H}" fill="url(#dots)"/>
	<rect x="40" y="40" width="1120" height="550" fill="none" stroke="#f9eedb" stroke-opacity="0.34" stroke-width="1.5"/>
	<g fill="#e0492c">
		<rect x="40" y="40" width="2" height="22"/>
		<rect x="40" y="40" width="22" height="2"/>
		<rect x="1158" y="40" width="2" height="22"/>
		<rect x="1138" y="40" width="22" height="2"/>
		<rect x="40" y="568" width="2" height="22"/>
		<rect x="40" y="588" width="22" height="2"/>
		<rect x="1158" y="568" width="2" height="22"/>
		<rect x="1138" y="588" width="22" height="2"/>
	</g>
	<g transform="translate(78 70) scale(2.1)">
		${LOCKUP_DARK_OUTLINED.trim()}
	</g>
	<text x="80" y="220" font-family="ui-monospace, 'Menlo', monospace" font-size="18" letter-spacing="6" fill="#e0492c" font-weight="500">PLATE 01 · KMK·QR</text>
	<text x="80" y="320" font-family="Georgia, serif" font-size="78" font-weight="400" fill="#f9eedb" letter-spacing="-2">
		<tspan>A QR code that</tspan>
	</text>
	<text x="80" y="400" font-family="Georgia, serif" font-style="italic" font-size="78" font-weight="400" fill="#e0492c" letter-spacing="-2">
		<tspan>doesn’t want anything</tspan>
	</text>
	<text x="80" y="475" font-family="Georgia, serif" font-style="italic" font-size="78" font-weight="400" fill="#e0492c" letter-spacing="-2">
		<tspan>from you.</tspan>
	</text>
	<text x="80" y="535" font-family="ui-monospace, 'Menlo', monospace" font-size="18" fill="#f9eedb" opacity="0.62" letter-spacing="2.5">
		<tspan>Free · No signup · No tracking · Logo + styling included.</tspan>
	</text>
	<g transform="translate(80 565)" font-family="ui-monospace, 'Menlo', monospace" font-size="13" fill="#f9eedb" letter-spacing="3">
		<text opacity="0.55">PNG · SVG · PDF</text>
		<text x="215" opacity="0.55">CLIENT-SIDE</text>
		<text x="430" opacity="0.55">EDITION I — V·MMXXVI</text>
	</g>

	<!-- Specimen card on the right. Real QR encoding the canonical
	     site URL (was a hand-drawn mosaic + SCAN ME label that
	     promised more than it delivered). Cream quiet-zone field
	     under the ink modules so the QR follows scan-reliability
	     rules regardless of the card's dark mode (per CLAUDE.md
	     QR-color guardrail). -->
	<g transform="translate(925 80)">
		<rect width="195" height="470" fill="#16130d" stroke="#f9eedb" stroke-opacity="0.34" stroke-width="1"/>
		<text x="20" y="50" font-family="ui-monospace, 'Menlo', monospace" font-size="12" letter-spacing="3" fill="#f9eedb" opacity="0.55">PLATE</text>
		<text x="97.5" y="135" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="76" fill="#e0492c" letter-spacing="-2">01</text>
		<line x1="0" y1="175" x2="195" y2="175" stroke="#f9eedb" stroke-width="1" opacity="0.2"/>

		<g transform="translate(${QR_CARD_X} ${QR_CARD_Y})">
			<!-- Cream quiet-zone tile (165×165). -->
			<rect width="${QR_TILE_PX}" height="${QR_TILE_PX}" fill="#f9eedb"/>
			<g transform="translate(${QR_PAD * QR_CELL} ${QR_PAD * QR_CELL}) scale(${QR_CELL})" fill="#0e0b06">
				<path d="${qrPath()}"/>
			</g>
		</g>

		<line x1="0" y1="${QR_CARD_Y + QR_TILE_PX + 25}" x2="195" y2="${QR_CARD_Y + QR_TILE_PX + 25}" stroke="#f9eedb" stroke-width="1" opacity="0.2"/>
		<text x="97.5" y="${QR_CARD_Y + QR_TILE_PX + 48}" text-anchor="middle" font-family="ui-monospace, 'Menlo', monospace" font-size="11" letter-spacing="3" fill="#f9eedb" opacity="0.62">SCAN ME</text>
		<text x="97.5" y="${QR_CARD_Y + QR_TILE_PX + 65}" text-anchor="middle" font-family="ui-monospace, 'Menlo', monospace" font-size="10" letter-spacing="2" fill="#e0492c">qr.kemek.com</text>
	</g>
</svg>
`;

await writeFile('static/og.svg', OG_SVG);

/* sharp's `density` controls SVG-to-raster DPI. We use a high value
 * for small icons so the resize step gets crisp pixels rather than
 * blurry resampling from a low-DPI rasterization. */
async function rasterize(svg, size, dest) {
	await sharp(svg, { density: Math.max(300, size * 4) })
		.resize(size, size)
		.png()
		.toFile(dest);
}

/* OG card stays at native dimensions (1200×630). Density 144 gives
 * sharp enough sub-pixel detail for the QR module grid + outlined
 * Fraunces glyphs to rasterize cleanly. */
await sharp(Buffer.from(OG_SVG), { density: 144 }).png().toFile('static/og.png');

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
