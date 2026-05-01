/* Regenerates the static PNG renditions from their SVG masters.
 * Run: `npm run build:images`. Re-run whenever favicon.svg or og.svg
 * change. The PNG outputs are committed because they're consumed by
 * platforms (iOS, OG scrapers) that don't accept SVG. */

import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const DENSITY = 144;

await sharp(await readFile('static/og.svg'), { density: DENSITY })
	.png()
	.toFile('static/og.png');

await sharp(await readFile('static/favicon.svg'), { density: 600 })
	.resize(180, 180)
	.png()
	.toFile('static/apple-touch-icon.png');

await sharp(await readFile('static/favicon.svg'), { density: 600 })
	.resize(32, 32)
	.png()
	.toFile('static/favicon-32.png');

console.log('static images regenerated.');
