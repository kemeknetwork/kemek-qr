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
 *
 * Per-type content rides in `c` as the type's payload object. The `t`
 * field names the type ('url', 'wifi', ...). Both are optional — a hash
 * with neither restores nothing type-related, which is the original
 * 0.1.0 shape.
 */

import { CONTENT_TYPES, DEFAULT_CONTENT, type ContentMap, type ContentType } from './types';

export type DotType =
	| 'square'
	| 'rounded'
	| 'dots'
	| 'classy'
	| 'classy-rounded'
	| 'extra-rounded';

export type ECC = 'auto' | 'L' | 'M' | 'Q' | 'H';

export type EyeFrameType = 'square' | 'extra-rounded' | 'dot' | 'rounded';
export type EyeBallType = 'square' | 'dot' | 'rounded';
export type FrameLabelSize = 'S' | 'M' | 'L' | 'XL';
export type FrameLabelFont = 'mono' | 'display';

export type StylingState = {
	fg: string;
	bg: string;
	dot: DotType;
	ecc: ECC;
	logoSize: number;
	logoDataUrl: string | null;
	gradientEnabled: boolean;
	gradientFrom: string;
	gradientTo: string;
	gradientAngle: number;
	eyeFrame: EyeFrameType;
	eyeBall: EyeBallType;
	frameEnabled: boolean;
	frameLabel: string;
	frameLabelSize: FrameLabelSize;
	frameLabelFont: FrameLabelFont;
};

export type PermalinkState<T extends ContentType = ContentType> = StylingState & {
	type: T;
	content: ContentMap[T];
};

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

const EYE_FRAME_VALUES: ReadonlySet<EyeFrameType> = new Set([
	'square',
	'extra-rounded',
	'dot',
	'rounded'
]);

const EYE_BALL_VALUES: ReadonlySet<EyeBallType> = new Set(['square', 'dot', 'rounded']);

const FRAME_LABEL_SIZE_VALUES: ReadonlySet<FrameLabelSize> = new Set(['S', 'M', 'L', 'XL']);
const FRAME_LABEL_FONT_VALUES: ReadonlySet<FrameLabelFont> = new Set(['mono', 'display']);

/* Mixed-case because the permalink decoder sees raw user input
 * from the URL hash, which may have been shared with either case.
 * Generator.svelte carries a parallel HEX_RE that's uppercase-only —
 * deliberately different, runs after sanitizeHex's toUpperCase(). */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const TYPES_SET: ReadonlySet<ContentType> = new Set(CONTENT_TYPES);

/* Narrowing validators — each returns a TS type-guard so the
 * decoder can assign `out.field = w.x` without `as` casts. Adding
 * a new wire field becomes a one-liner using the matching helper. */
function isOneOf<T extends string>(v: unknown, set: ReadonlySet<T>): v is T {
	/* The `set as ReadonlySet<string>` cast is narrowly scoped here so
	 * `.has(v)` accepts an `unknown`-narrowed-to-`string` value —
	 * `Set<T>.has()` insists on `T` typing-wise, but at runtime any
	 * value works and a non-T input correctly returns false. The
	 * function's `v is T` predicate gives the caller a real narrowing,
	 * so call sites stay cast-free. */
	return typeof v === 'string' && (set as ReadonlySet<string>).has(v);
}
function isHexColor(v: unknown): v is string {
	return typeof v === 'string' && HEX_RE.test(v);
}
function isNumberInRange(v: unknown, min: number, max: number): v is number {
	return typeof v === 'number' && v >= min && v <= max;
}
function isStringMaxLen(v: unknown, max: number): v is string {
	return typeof v === 'string' && v.length <= max;
}

type WireV1 = {
	t?: ContentType;
	c?: Record<string, unknown>;
	f?: string;
	b?: string;
	d?: DotType;
	e?: ECC;
	ls?: number;
	l?: string;
	/* Gradient: g flag, gf from, gt to, ga angle in degrees */
	g?: boolean;
	gf?: string;
	gt?: string;
	ga?: number;
	ef?: EyeFrameType;
	eb?: EyeBallType;
	/* Outer frame: fr flag, fl label text, fls label size (S|M|L|XL),
	 * flf label font ('mono' | 'display') */
	fr?: boolean;
	fl?: string;
	fls?: FrameLabelSize;
	flf?: FrameLabelFont;
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

function buildWire<T extends ContentType>(
	state: PermalinkState<T>,
	includeLogo: boolean
): WireV1 {
	const w: WireV1 = {
		t: state.type,
		c: state.content as unknown as Record<string, unknown>,
		f: state.fg,
		b: state.bg,
		d: state.dot,
		e: state.ecc,
		ls: state.logoSize,
		ef: state.eyeFrame,
		eb: state.eyeBall
	};
	if (includeLogo && state.logoDataUrl) w.l = state.logoDataUrl;
	/* Only emit gradient/frame fields when active so default-state
	 * permalinks stay short. */
	if (state.gradientEnabled) {
		w.g = true;
		w.gf = state.gradientFrom;
		w.gt = state.gradientTo;
		w.ga = state.gradientAngle;
	}
	if (state.frameEnabled) {
		w.fr = true;
		w.fl = state.frameLabel;
		/* Skip default 'M' size + 'mono' font on the wire so plain
		 * frame-label users get the shortest possible permalink. */
		if (state.frameLabelSize !== 'M') w.fls = state.frameLabelSize;
		if (state.frameLabelFont !== 'mono') w.flf = state.frameLabelFont;
	}
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

export function encodePermalink<T extends ContentType>(
	state: PermalinkState<T>,
	baseUrl: string
): EncodeResult {
	const stripped = baseUrl.split('#')[0];
	const withLogo = `${stripped}#s=${encodeWire(buildWire(state, true))}`;

	if (state.logoDataUrl && withLogo.length > MAX_URL_LEN) {
		const withoutLogo = `${stripped}#s=${encodeWire(buildWire(state, false))}`;
		return { hash: withoutLogo.split('#')[1], url: withoutLogo, logoDropped: true };
	}

	return { hash: withLogo.split('#')[1], url: withLogo, logoDropped: false };
}

export type DecodedPermalink = Partial<StylingState> & {
	type?: ContentType;
	content?: Record<string, unknown>;
};

/* Validate per-type content shape: drop any unknown keys but trust
 * scalar values to be strings/booleans where the form expects them.
 * Form components call .toString()/coerce defensively, so a bad value
 * surfaces as an empty field rather than a crash. Allowed keys come
 * from DEFAULT_CONTENT so the two stay in lockstep — adding a field to
 * a content shape automatically extends what the decoder accepts. */
function validateContent(type: ContentType, c: unknown): Record<string, unknown> | null {
	if (!c || typeof c !== 'object') return null;
	const obj = c as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const k of Object.keys(DEFAULT_CONTENT[type])) {
		if (k in obj) out[k] = obj[k];
	}
	return out;
}

export function decodePermalink(hash: string): DecodedPermalink | null {
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
	const out: DecodedPermalink = {};

	if (isOneOf(w.t, TYPES_SET)) out.type = w.t;
	if (out.type && w.c) {
		const v = validateContent(out.type, w.c);
		if (v) out.content = v;
	}
	if (isHexColor(w.f)) out.fg = w.f;
	if (isHexColor(w.b)) out.bg = w.b;
	if (isOneOf(w.d, DOT_TYPES)) out.dot = w.d;
	if (isOneOf(w.e, ECC_VALUES)) out.ecc = w.e;
	if (isNumberInRange(w.ls, 0.05, 0.5)) out.logoSize = w.ls;
	if (typeof w.l === 'string' && w.l.startsWith('data:image/')) out.logoDataUrl = w.l;
	if (isOneOf(w.ef, EYE_FRAME_VALUES)) out.eyeFrame = w.ef;
	if (isOneOf(w.eb, EYE_BALL_VALUES)) out.eyeBall = w.eb;
	if (w.g === true) {
		out.gradientEnabled = true;
		if (isHexColor(w.gf)) out.gradientFrom = w.gf;
		if (isHexColor(w.gt)) out.gradientTo = w.gt;
		if (isNumberInRange(w.ga, 0, 360)) out.gradientAngle = w.ga;
	}
	if (w.fr === true) {
		out.frameEnabled = true;
		if (isStringMaxLen(w.fl, 64)) out.frameLabel = w.fl;
		if (isOneOf(w.fls, FRAME_LABEL_SIZE_VALUES)) out.frameLabelSize = w.fls;
		if (isOneOf(w.flf, FRAME_LABEL_FONT_VALUES)) out.frameLabelFont = w.flf;
	}

	return out;
}
