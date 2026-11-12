import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Cloudflare Pages runs the Functions middleware for every path that
 * `static/_routes.json` doesn't exclude. A static file nobody added to
 * the exclude list still serves correctly, so nothing visible breaks —
 * it just costs a Function invocation per hit. This test is the only
 * place that omission shows up. */

const STATIC = join(process.cwd(), 'static');
const routes = JSON.parse(readFileSync(join(STATIC, '_routes.json'), 'utf8')) as {
	include: string[];
	exclude: string[];
};

/* Pages reads these two itself; they are never served. */
const PAGES_CONFIG = new Set(['_headers', '_routes.json']);

const excluded = (path: string) =>
	routes.exclude.some((rule) =>
		rule.endsWith('/*') ? path.startsWith(rule.slice(0, -1)) : path === rule
	);

describe('static/_routes.json', () => {
	const entries = readdirSync(STATIC).filter((name) => !PAGES_CONFIG.has(name));

	it.each(entries)('excludes /%s from the Functions middleware', (name) => {
		const isDir = statSync(join(STATIC, name)).isDirectory();
		const probe = isDir ? `/${name}/any-file` : `/${name}`;
		expect(excluded(probe)).toBe(true);
	});

	it('excludes the hashed build assets', () => {
		expect(excluded('/_app/immutable/chunks/x.js')).toBe(true);
	});

	it('stays within the 100-rule limit Pages enforces at deploy', () => {
		expect(routes.include.length + routes.exclude.length).toBeLessThanOrEqual(100);
	});
});
