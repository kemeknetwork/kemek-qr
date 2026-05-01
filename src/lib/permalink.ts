/* Permalink hash encoding for kemek-qr.
 *
 * Format: `#s=v1.<base64url(JSON)>`
 *
 * Terse single-letter keys keep the encoded payload short — the entire
 * link is meant to be paste-friendly in chat clients that get flaky past
 * ~2 KB. Unknown keys are ignored on decode so future schema additions
 * stay backwards-compatible. The `v1.` prefix gates a future hard
 * migration; bump only on a breaking shape change.
 *
 * Logos: included when the resulting full URL ≤ MAX_URL_LEN. Otherwise
 * dropped from the encoded payload and surfaced via { logoDropped: true }
 * on the encode side so the UI can warn the sender. A receiver getting a
 * link without a logo just renders without one.
 */

export type DotType =
	| 'square'
	| 'rounded'
	| 'dots'
	| 'classy'
	| 'classy-rounded'
	| 'extra-rounded';

export type ECC = 'auto' | 'L' | 'M' | 'Q' | 'H';

export type PermalinkState = {
	url: string;
	fg: string;
	bg: string;
	dot: DotType;
	ecc: ECC;
	logoSize: number;
	logoDataUrl: string | null;
};

/* Soft cap — many chat clients linkify cleanly at <2 KB but tolerate up
 * to ~6 KB. Beyond that, paste reliability degrades. The logo is the only
 * field that can blow this up; everything else is bounded. */
const MAX_URL_LEN = 6000;

const DOT_TYPES: ReadonlySet<DotType> = new Set([
	'square',
	'rounded',
	'dots',
	'classy',
	'classy-rounded',
	'extra-rounded'
]);

const ECC_VALUES: ReadonlySet<ECC> = new Set(['auto', 'L', 'M', 'Q', 'H']);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type WireV1 = {
	u?: string;
	f?: string;
	b?: string;
	d?: DotType;
	e?: ECC;
	ls?: number;
	l?: string;
};

function toBase64Url(s: string): string {
	const bytes = new TextEncoder().encode(s);
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
	const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
	const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

function buildWire(state: PermalinkState, includeLogo: boolean): WireV1 {
	const w: WireV1 = {
		u: state.url,
		f: state.fg,
		b: state.bg,
		d: state.dot,
		e: state.ecc,
		ls: state.logoSize
	};
	if (includeLogo && state.logoDataUrl) w.l = state.logoDataUrl;
	return w;
}

function encodeWire(w: WireV1): string {
	return `v1.${toBase64Url(JSON.stringify(w))}`;
}

export type EncodeResult = {
	hash: string;
	url: string;
	logoDropped: boolean;
};

/* Encode state into a sharable permalink hash. `baseUrl` is the page
 * URL the recipient will land on; we only return `url` so the caller
 * can copy it directly. */
export function encodePermalink(state: PermalinkState, baseUrl: string): EncodeResult {
	const stripped = baseUrl.split('#')[0];
	const withLogo = `${stripped}#s=${encodeWire(buildWire(state, true))}`;

	if (state.logoDataUrl && withLogo.length > MAX_URL_LEN) {
		const withoutLogo = `${stripped}#s=${encodeWire(buildWire(state, false))}`;
		return { hash: withoutLogo.split('#')[1], url: withoutLogo, logoDropped: true };
	}

	return { hash: withLogo.split('#')[1], url: withLogo, logoDropped: false };
}

/* Decode a hash fragment (with or without leading `#`) into a partial
 * state. Returns null when the input is malformed or version-incompatible.
 * Each field is validated independently — a bad single field is dropped,
 * not the whole payload. */
export function decodePermalink(hash: string): Partial<PermalinkState> | null {
	const raw = hash.startsWith('#') ? hash.slice(1) : hash;
	const m = raw.match(/^s=v1\.(.+)$/);
	if (!m) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(fromBase64Url(m[1]));
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object') return null;

	const w = parsed as WireV1;
	const out: Partial<PermalinkState> = {};

	if (typeof w.u === 'string') out.url = w.u;
	if (typeof w.f === 'string' && HEX_RE.test(w.f)) out.fg = w.f;
	if (typeof w.b === 'string' && HEX_RE.test(w.b)) out.bg = w.b;
	if (typeof w.d === 'string' && DOT_TYPES.has(w.d as DotType)) out.dot = w.d as DotType;
	if (typeof w.e === 'string' && ECC_VALUES.has(w.e as ECC)) out.ecc = w.e as ECC;
	if (typeof w.ls === 'number' && w.ls >= 0.05 && w.ls <= 0.5) out.logoSize = w.ls;
	if (typeof w.l === 'string' && w.l.startsWith('data:image/')) out.logoDataUrl = w.l;

	return out;
}
