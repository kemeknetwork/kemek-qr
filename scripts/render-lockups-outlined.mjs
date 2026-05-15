/* Builds true font-independent SVG lockups by extracting the
 * Fraunces glyph outlines for "kemek/qr" via opentype.js and
 * combining them with the canonical mark geometry. The output SVG
 * has zero font dependency — every glyph is an explicit `<path>` —
 * so it scales to any size at any print shop / vector editor / RIP
 * with identical output.
 *
 * Why this is necessary: lockup-light.svg + lockup-dark.svg use a
 * `<text>` element with `font-family: 'Fraunces Variable', ...`.
 * If the consumer doesn't have Fraunces, the SVG falls back to
 * Georgia / serif — visibly different. Outlined SVG sidesteps that
 * entirely.
 *
 * The mark portion stays as `<rect>` + `<path>` geometry (already
 * font-independent and pixel-perfect at any size).
 *
 * Usage: `node scripts/render-lockups-outlined.mjs`. Requires
 * `opentype.js` + `wawoff2` (npm install --no-save). The Fraunces
 * woff2 files in `node_modules/@fontsource-variable/fraunces/files/`
 * are the source.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import opentype from 'opentype.js';
import { decompress as decompressWoff2 } from 'wawoff2';

const ROOT = resolve(import.meta.dirname, '..');

/* Axis values match what the browser actually applies on the live
 * masthead, NOT what looked right in isolation. The masthead uses:
 *
 *   font-family: var(--font-display);   // Fraunces Variable
 *   font-weight: 500;
 *   font-size: 31px;                     // and font-optical-sizing
 *                                         // defaults to `auto`, which
 *                                         // pins opsz ≈ font-size.
 *
 * Forcing opsz to a different value (e.g. 14 for "small optical /
 * heavier strokes") makes the outlined glyphs visibly diverge from
 * the live rendering — most noticeably the `m` leg angles and the
 * `q` descender curl. Stay on opsz=31 so the outlined SVG matches
 * what the browser actually paints.
 *
 * The `.brand-name` rule pins `font-feature-settings: 'ss01'`, but
 * the @fontsource Fraunces subsets only ship `liga` + `rvrn` (no
 * ss01), so the browser silently ignores the feature setting and
 * we don't need to apply it here either — the result is the same.
 *
 * Slash uses the italic font (`.brand-slash { font-style: italic
 * }`), no feature settings. Margin mirrors `margin: 0 0.06em`. */
const FONT_SIZE = 31;
const WEIGHT = 500;
const OPSZ = 31;
const LETTER_SPACING_EM = -0.015;
const SLASH_MARGIN_EM = 0.06;

/* Vertical-alignment nudge so the wordmark sits where the live
 * masthead puts it. The masthead uses CSS `align-items: center` on
 * an inline-flex container; both the mark and the wordmark line-box
 * are centered on the same horizontal axis. But the *visual* center
 * of lowercase Fraunces sits BELOW the line-box center (cap-height
 * extends further up than the descender extends down), and the mark
 * is additionally lifted 1 px (`transform: translateY(-1px)` in
 * `.brand-mark`). The 8 px value here was tuned empirically against
 * the masthead screenshot reference until pixel diff fell under the
 * tolerance — see scripts/render-lockups.mjs for the canonical
 * pixel-pull from the live rendered DOM. */
const WORDMARK_BASELINE_NUDGE_PX = 8;

/* Padding (SVG units) around the mark + wordmark on all four sides.
 * Without it the mark sits flush against the left viewBox edge and
 * the slash terminals against the right — fine for in-page DOM
 * embed, ugly as a standalone brand asset. */
const EDGE_PADDING = 6;

/* Load + parse a woff2 font file. opentype.js doesn't natively read
 * woff2 — wawoff2 decompresses to TTF first. */
async function loadFont(woff2Path) {
	const woff2 = await readFile(woff2Path);
	const ttf = await decompressWoff2(woff2);
	/* wawoff2 returns a Uint8Array that may be a view over a larger
	 * buffer; slice to the exact range so opentype.js sees only the
	 * decompressed TTF bytes (otherwise the signature check fails). */
	const ab = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength);
	return opentype.parse(ab);
}

/* Returns the SVG `d` attribute for a single glyph at the target
 * size + variable-axis values + OpenType features + position.
 * opentype.js's getPath() returns a Path object; toPathData() emits
 * SVG path syntax. `getPath`'s `bbox` is also captured here so the
 * caller can size the canvas to fit ascenders / descenders / italic
 * overshoot.
 *
 * OpenType features must be passed explicitly — opentype.js does
 * NOT apply lookups like `ss01` or `kern` by default. Without
 * `ss01: true` the wordmark renders Fraunces's default forms; with
 * it, the alternate forms the masthead's `.brand-name` rule pins
 * via `font-feature-settings: 'ss01'`. */
function glyphPath(font, char, x, y, size, variation, features = {}) {
	const path = font.getPath(char, x, y, size, { variation, features });
	const bbox = path.getBoundingBox();
	return {
		d: path.toPathData(3),
		advance: font.charToGlyph(char).advanceWidth * (size / font.unitsPerEm),
		yMin: bbox.y1,
		yMax: bbox.y2
	};
}

async function buildLockup({ wordmarkColor, accentColor, outPath }) {
	const fontRoman = await loadFont(
		resolve(
			ROOT,
			'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2'
		)
	);
	const fontItalic = await loadFont(
		resolve(
			ROOT,
			'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2'
		)
	);

	const variation = { wght: WEIGHT, opsz: OPSZ };

	/* No features applied — the @fontsource Fraunces subsets don't
	 * ship `ss01`, so the masthead's `font-feature-settings: 'ss01'`
	 * is a no-op at runtime; matching that no-op here. */
	const wordmarkFeatures = {};
	const slashFeatures = {};

	/* Wordmark starts at: edge padding + mark width 30 + 9 gap. */
	const WORDMARK_X_START = EDGE_PADDING + 30 + 9;
	const letterSpacingPx = LETTER_SPACING_EM * FONT_SIZE;
	const slashMarginPx = SLASH_MARGIN_EM * FONT_SIZE;

	let x = WORDMARK_X_START;
	const wordmarkPaths = [];
	const accentSlashPaths = [];

	const sequence = [
		{ char: 'k', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures },
		{ char: 'e', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures },
		{ char: 'm', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures },
		{ char: 'e', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures },
		{ char: 'k', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures },
		{
			char: '/',
			font: fontItalic,
			fill: accentColor,
			marginPx: slashMarginPx,
			features: slashFeatures
		},
		{ char: 'q', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures },
		{ char: 'r', font: fontRoman, fill: wordmarkColor, features: wordmarkFeatures }
	];

	/* First pass: lay out glyphs at a temporary baseline (y=0) just to
	 * harvest each glyph's vertical extent. Then size the canvas to
	 * fit the deepest descender + tallest ascender + a small margin,
	 * and re-emit at the final baseline. */
	let glyphYMin = 0;
	let glyphYMax = 0;
	for (const g of sequence) {
		const probe = glyphPath(g.font, g.char, 0, 0, FONT_SIZE, variation, g.features);
		glyphYMin = Math.min(glyphYMin, probe.yMin);
		glyphYMax = Math.max(glyphYMax, probe.yMax);
	}

	const canvasHeight = Math.ceil(
		glyphYMax - glyphYMin + EDGE_PADDING * 2 + WORDMARK_BASELINE_NUDGE_PX
	);
	/* The mark's natural footprint is 30 + (2 × padding). Make sure
	 * the canvas can fit it too. */
	const HEIGHT = Math.max(canvasHeight, 30 + EDGE_PADDING * 2);
	const WORDMARK_Y_BASELINE = Math.round(-glyphYMin + EDGE_PADDING + WORDMARK_BASELINE_NUDGE_PX);

	for (const g of sequence) {
		if (g.marginPx) x += g.marginPx;
		const { d, advance } = glyphPath(
			g.font,
			g.char,
			x,
			WORDMARK_Y_BASELINE,
			FONT_SIZE,
			variation,
			g.features
		);
		if (g.fill === accentColor) {
			accentSlashPaths.push(d);
		} else {
			wordmarkPaths.push(d);
		}
		x += advance + letterSpacingPx;
		if (g.marginPx) x += g.marginPx;
	}

	const totalWidth = Math.ceil(x + EDGE_PADDING);
	/* Vertically center the mark in the (possibly-taller) canvas, so
	 * the mark's optical center still aligns with the wordmark's
	 * x-height region the way the masthead does it. */
	const markTop = Math.round((HEIGHT - 30) / 2);

	/* Mark — same 7-unit shape as src/routes/+layout.svelte's
	 * `.brand-mark`, scaled to 30 × 30 and translated to fit the
	 * (possibly taller-than-mark) canvas. */
	const markGroup = `\t<g transform="translate(${EDGE_PADDING} ${markTop}) scale(4.2857)" fill="${accentColor}">
\t\t<path d="M0 0h3v1H0zM0 2h3v1H0zM0 1h1v1H0zM2 1h1v1H2z" />
\t\t<path d="M4 0h3v1H4zM4 2h3v1H4zM4 1h1v1H4zM6 1h1v1H6z" />
\t\t<path d="M0 4h3v1H0zM0 6h3v1H0zM0 5h1v1H0zM2 5h1v1H2z" />
\t\t<rect x="4" y="4" width="1" height="1" />
\t\t<rect x="6" y="4" width="1" height="1" />
\t\t<rect x="5" y="5" width="1" height="1" />
\t\t<rect x="4" y="6" width="1" height="1" />
\t\t<rect x="6" y="6" width="1" height="1" />
\t</g>`;

	const wordmarkGroup = `\t<g fill="${wordmarkColor}">
${wordmarkPaths.map((d) => `\t\t<path d="${d}" />`).join('\n')}
\t</g>`;

	const slashGroup = `\t<g fill="${accentColor}">
${accentSlashPaths.map((d) => `\t\t<path d="${d}" />`).join('\n')}
\t</g>`;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${HEIGHT}" width="${totalWidth}" height="${HEIGHT}" role="img" aria-label="kemek/qr lockup (outlined)">
\t<title>kemek-qr horizontal lockup — outlined glyphs, font-independent</title>
${markGroup}
${wordmarkGroup}
${slashGroup}
</svg>
`;

	await writeFile(resolve(ROOT, outPath), svg, 'utf8');
	console.log(`${outPath}: built (${totalWidth} × ${HEIGHT}, all paths)`);
}

await buildLockup({
	wordmarkColor: '#0e0b06',
	accentColor: '#c53a1f',
	outPath: 'static/brand/lockup-light-outlined.svg'
});

await buildLockup({
	wordmarkColor: '#f9eedb',
	accentColor: '#c53a1f',
	outPath: 'static/brand/lockup-dark-outlined.svg'
});

console.log('outlined lockups built — font-independent, scales to any size.');
