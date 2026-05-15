/* Composes a multi-plate specimen sheet for comparing QR + plate
 * treatments side-by-side. One-off exploration tool — not wired into
 * the build pipeline. Source PNGs and rendered output live in
 * .specimen-study/ (gitignored).
 *
 * Usage:
 *   node scripts/build-demo-plates.mjs <plate>... [--out <path>]
 *
 * Each <plate> is "path[:label[:treatment]]":
 *   path       — input QR PNG (absolute or relative to cwd)
 *   label      — caption under the plate; defaults to filename basename
 *   treatment  — "framed" (cream quiet-zone tile + 4 px inset, the
 *                pre-0.34.19 OG treatment) or "flush" (no tile, 0
 *                inset, the QR's own dark ground sits on the plate
 *                panel — current shipped treatment). Defaults to
 *                "framed".
 *
 * Example (recreates the 3-plate study that drove 0.34.19):
 *   node scripts/build-demo-plates.mjs \
 *     .specimen-study/stock.png:STOCK:framed \
 *     .specimen-study/v2-warm-gradient.png:'WARM GRADIENT':framed \
 *     .specimen-study/inverted.png:'INVERTED · FLUSH':flush \
 *     --out .specimen-study/demo.png
 *
 * Geometry mirrors the OG card's specimen card (`scripts/build-
 * images.mjs`) so the comparison sheet reads as the same surface
 * family. */

import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'node:path';

const args = process.argv.slice(2);
let outPath = '.specimen-study/demo.png';
const plateSpecs = [];
for (let i = 0; i < args.length; i++) {
	if (args[i] === '--out') {
		outPath = args[++i];
	} else {
		plateSpecs.push(args[i]);
	}
}

if (plateSpecs.length === 0) {
	console.error(
		'Usage: node scripts/build-demo-plates.mjs <path[:label[:treatment]]>... [--out <path>]\n' +
			'  treatment: framed (default) | flush'
	);
	process.exit(1);
}

const TREATMENTS = {
	framed: { creamTile: true, inset: 4 },
	flush: { creamTile: false, inset: 0 }
};

const plates = await Promise.all(
	plateSpecs.map(async (spec, i) => {
		const [path, labelRaw, treatmentRaw] = spec.split(':');
		const treatment = treatmentRaw || 'framed';
		if (!TREATMENTS[treatment]) {
			throw new Error(`Unknown treatment "${treatment}" for ${path}. Use "framed" or "flush".`);
		}
		const label = (labelRaw || parse(path).name).toUpperCase();
		const buf = await readFile(path);
		return {
			num: String(i + 1).padStart(2, '0'),
			label,
			uri: `data:image/png;base64,${buf.toString('base64')}`,
			...TREATMENTS[treatment]
		};
	})
);

const CARD_W = 210;
const CARD_H = 490;
const CARD_CX = CARD_W / 2;
const QR_TILE_PX = 178;
const QR_TILE_X = (CARD_W - QR_TILE_PX) / 2;
const QR_TILE_Y = 195;

function plateSvg(p, x, y) {
	const imgPx = QR_TILE_PX - 2 * p.inset;
	const imgX = QR_TILE_X + p.inset;
	const imgY = QR_TILE_Y + p.inset;
	return `<g transform="translate(${x} ${y})">
		<rect width="${CARD_W}" height="${CARD_H}" fill="#16130d" stroke="#f9eedb" stroke-opacity="0.34" stroke-width="1"/>
		<text x="20" y="55" font-family="ui-monospace, 'Menlo', monospace" font-size="22" letter-spacing="3" fill="#f9eedb" opacity="0.6">PLATE</text>
		<text x="${CARD_CX}" y="142" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="82" fill="#e0492c" letter-spacing="-2">${p.num}</text>
		<line x1="0" y1="180" x2="${CARD_W}" y2="180" stroke="#f9eedb" stroke-width="1" opacity="0.2"/>
		${p.creamTile ? `<rect x="${QR_TILE_X}" y="${QR_TILE_Y}" width="${QR_TILE_PX}" height="${QR_TILE_PX}" fill="#f9eedb"/>` : ''}
		<image href="${p.uri}" x="${imgX}" y="${imgY}" width="${imgPx}" height="${imgPx}"/>
		<line x1="0" y1="${QR_TILE_Y + QR_TILE_PX + 25}" x2="${CARD_W}" y2="${QR_TILE_Y + QR_TILE_PX + 25}" stroke="#f9eedb" stroke-width="1" opacity="0.2"/>
		<text x="${CARD_CX}" y="${QR_TILE_Y + QR_TILE_PX + 60}" text-anchor="middle" font-family="ui-monospace, 'Menlo', monospace" font-size="18" letter-spacing="3" fill="#f9eedb" opacity="0.7">${p.label}</text>
		<text x="${CARD_CX}" y="${QR_TILE_Y + QR_TILE_PX + 88}" text-anchor="middle" font-family="ui-monospace, 'Menlo', monospace" font-size="16" letter-spacing="1.5" fill="#e0492c">qr.kemek.com</text>
	</g>`;
}

const GUTTER = 75;
const SIDE_PAD = 60;
const TOP_PAD = 110;
const BOT_PAD = 60;
const W = SIDE_PAD * 2 + plates.length * CARD_W + (plates.length - 1) * GUTTER;
const H = TOP_PAD + CARD_H + BOT_PAD;

const plateGroups = plates
	.map((p, i) => plateSvg(p, SIDE_PAD + i * (CARD_W + GUTTER), TOP_PAD))
	.join('\n');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
	<defs>
		<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
			<circle cx="7" cy="7" r="1.4" fill="#f9eedb" opacity="0.04"/>
		</pattern>
	</defs>
	<rect width="${W}" height="${H}" fill="#100e09"/>
	<rect width="${W}" height="${H}" fill="url(#dots)"/>
	<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#f9eedb" stroke-opacity="0.34" stroke-width="1.5"/>
	<g fill="#e0492c">
		<rect x="40" y="40" width="2" height="22"/>
		<rect x="40" y="40" width="22" height="2"/>
		<rect x="${W - 42}" y="40" width="2" height="22"/>
		<rect x="${W - 62}" y="40" width="22" height="2"/>
		<rect x="40" y="${H - 62}" width="2" height="22"/>
		<rect x="40" y="${H - 42}" width="22" height="2"/>
		<rect x="${W - 42}" y="${H - 62}" width="2" height="22"/>
		<rect x="${W - 62}" y="${H - 42}" width="22" height="2"/>
	</g>
	<text x="60" y="80" font-family="ui-monospace, 'Menlo', monospace" font-size="18" letter-spacing="3" fill="#f9eedb" opacity="0.7">SPECIMEN PLATES — TREATMENT STUDY</text>
	<text x="${W - 60}" y="80" text-anchor="end" font-family="ui-monospace, 'Menlo', monospace" font-size="14" letter-spacing="1.5" fill="#f9eedb" opacity="0.42">KMK·QR</text>
	${plateGroups}
</svg>`;

const svgPath = outPath.replace(/\.png$/, '.svg');
await writeFile(svgPath, SVG);
await sharp(svgPath, { density: 144 }).png().toFile(outPath);
console.log(`wrote ${outPath}`);
