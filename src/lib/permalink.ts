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

import {
	CONTENT_TYPES,
	DEFAULT_CONTENT,
	type ContentMap,
	type ContentType,
	type WifiAuth
} from './types';

export type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';

export type ECC = 'auto' | 'L' | 'M' | 'Q' | 'H';

export type EyeFrameType = 'square' | 'extra-rounded' | 'dot' | 'rounded';
export type EyeBallType = 'square' | 'dot' | 'rounded';
export type FrameLabelSize = 'S' | 'M' | 'L' | 'XL';
export type FrameLabelFont = 'mono' | 'display';
export type PngSize = '1K' | '2K' | '4K';

/* Pixel width for each PngSize bucket. 4K sits right at the iOS Safari
 * canvas-area limit (16,777,216 px) — framed 4K exceeds it, so the
 * download path falls back to the existing engineError surface if
 * canvas.toBlob returns null. Desktop and Android handle all three. */
export const PNG_SIZE_PX: Record<PngSize, number> = {
	'1K': 1024,
	'2K': 2048,
	'4K': 4096
};

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
	pngSize: PngSize;
};

export type PermalinkState<T extends ContentType = ContentType> = StylingState & {
	type: T;
	content: ContentMap[T];
};

const MAX_URL_LEN = 6000;

/* Hard upper bound on the base64url payload the decoder will accept.
 * Set generously over MAX_URL_LEN so every encode-side output passes,
 * while still capping the parse-time DoS lever — without this gate a
 * 100 MB hash would run `atob` + `JSON.parse` (both single-threaded
 * blocking) before any validator gets a chance to reject it. */
const MAX_PAYLOAD_LEN = 8192;

/* Per-field cap on string content values inside the decoded
 * permalink payload. Defaults like text/SSID/email body are
 * empty strings, so validateContent's `typeof === typeof default`
 * gate accepts any string length. A multi-MB value passes validation
 * cleanly and then crashes the QR encoder downstream. 4 KB is room
 * for every realistic content type (URLs ~ 2 KB practical, vCard
 * fields << 256, SMS body 1 KB) and an order of magnitude under the
 * MAX_PAYLOAD_LEN total. */
const MAX_CONTENT_FIELD_LEN = 4096;

/* Logo data-URL allowlist. The receiver embeds whatever data URL
 * lands here into a <svg:image href> — render-time safe via the
 * image-isolation boundary (browsers don't execute scripts in
 * referenced SVG resources), but the user's SVG download path
 * serializes the same data URL into their .svg file, and opening
 * that file standalone executes embedded scripts. The simplest
 * cure is to refuse SVG on the permalink lane entirely: receivers
 * can't be tricked into shipping a self-XSS payload. PNG/JPEG/WebP/
 * GIF cover every realistic logo use. The base64 alphabet anchor
 * also closes `data:image/png,<raw bytes>` (non-base64) which
 * qr-code-styling would fail on anyway. */
const LOGO_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MAX_LOGO_DATA_URL_LEN = 7000;

/* Module-load invariant: the envelope-size cap MUST exceed the
 * URL-length cap. If MAX_URL_LEN ever grows past MAX_PAYLOAD_LEN
 * the decoder would silently reject the encoder's own outputs —
 * fail loud at import time instead. */
if (MAX_PAYLOAD_LEN <= MAX_URL_LEN) {
	throw new Error(
		`permalink.ts: MAX_PAYLOAD_LEN (${MAX_PAYLOAD_LEN}) must exceed MAX_URL_LEN (${MAX_URL_LEN}); ` +
			`the decoder rejects payloads bigger than MAX_PAYLOAD_LEN but the encoder produces up to MAX_URL_LEN.`
	);
}

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
const PNG_SIZE_VALUES: ReadonlySet<PngSize> = new Set(['1K', '2K', '4K']);

/* String-literal-union members of content payloads. validateContent's
 * scalar `typeof === typeof default` gate accepts any string for a
 * field whose default is a string — including unbranded enum-typed
 * fields like wifi.auth. Without this lookup, a crafted permalink
 * with `auth: 'BOGUS'` would land in state typed as WifiAuth but
 * holding a non-WifiAuth string. Downstream encodeWifi would emit
 * a malformed-but-non-crashing `WIFI:T:BOGUS;…` payload. Adding new
 * enum-typed content fields means adding their value-set here. */
const WIFI_AUTH_VALUES: ReadonlySet<WifiAuth> = new Set(['WPA', 'WEP', 'nopass']);
const CONTENT_ENUM_VALUES: { [K in ContentType]?: { [field: string]: ReadonlySet<string> } } = {
	wifi: { auth: WIFI_AUTH_VALUES }
};

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
	/* Cast scoped here so `.has(v)` accepts an unknown-narrowed-to-
	 * string. The `v is T` predicate gives callers real narrowing
	 * without per-site `as` casts. */
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

/* Wire-format schema. Fields are typed at their intended target types
 * for the BUILD side — buildWire's object-literal assignment is the only
 * place these types are enforced, and that's exactly where we want
 * compile-time safety. On the DECODE side we treat each field as
 * `unknown` (see decodePermalink) because the input is caller-supplied
 * JSON; per-field validators do the narrowing. */
type WireV1 = {
	t?: ContentType;
	c?: ContentMap[ContentType];
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
	/* PNG export resolution: '1K' default, '2K' or '4K' for print/poster.
	 * Default '1K' is stripped from the wire (mirrors fls/flf pattern). */
	pnp?: PngSize;
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

function buildWire<T extends ContentType>(state: PermalinkState<T>, includeLogo: boolean): WireV1 {
	const w: WireV1 = {
		t: state.type,
		c: state.content,
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
	/* Default '1K' stripped on the wire to keep permalinks short
	 * (mirrors the fls / flf default-stripping pattern). */
	if (state.pngSize !== '1K') w.pnp = state.pngSize;
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
	content?: Partial<ContentMap[ContentType]>;
};

/* Validate per-type content shape: drop any unknown keys AND any keys
 * whose value type doesn't match the default's type. Allowed keys come
 * from DEFAULT_CONTENT so the two stay in lockstep — adding a field to
 * a content shape automatically extends what the decoder accepts. The
 * `typeof default === typeof value` gate closes a real crash vector:
 * a permalink with `{phone: {number: 12345}}` (number, not string)
 * would otherwise pass through and crash `encodePhone.number.replace()`
 * downstream inside the debounced render effect. */
function validateContent<T extends ContentType>(type: T, c: unknown): Partial<ContentMap[T]> | null {
	if (!c || typeof c !== 'object') return null;
	const obj = c as Record<string, unknown>;
	const defaults = DEFAULT_CONTENT[type] as Record<string, unknown>;
	const enumFields = CONTENT_ENUM_VALUES[type];
	const out: Record<string, unknown> = {};
	for (const k of Object.keys(defaults)) {
		if (!(k in obj)) continue;
		const v = obj[k];
		if (typeof v !== typeof defaults[k]) continue;
		/* String fields get a per-field length cap so a permalink can't
		 * carry a multi-MB SSID/text/body that survives validation only
		 * to crash the QR encoder downstream. See MAX_CONTENT_FIELD_LEN. */
		if (typeof v === 'string' && v.length > MAX_CONTENT_FIELD_LEN) continue;
		/* String-literal-union fields (e.g. wifi.auth) need their value
		 * checked against the union — typeof gates a string but doesn't
		 * narrow `'BOGUS'` out of `WifiAuth`. */
		if (enumFields && k in enumFields && !enumFields[k].has(v as string)) continue;
		out[k] = v;
	}
	return out as Partial<ContentMap[T]>;
}

export function decodePermalink(hash: string): DecodedPermalink | null {
	const raw = hash.startsWith('#') ? hash.slice(1) : hash;
	const m = raw.match(/^s=v1\.(.+)$/);
	if (!m) return null;
	if (m[1].length > MAX_PAYLOAD_LEN) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(fromBase64Url(m[1]));
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object') return null;

	/* Treat every wire field as unknown — the input is caller-supplied
	 * JSON from a URL hash, so the type-level optionality of WireV1
	 * (which exists for buildWire's compile-time safety) overstates
	 * what we actually know. Per-field validators do the narrowing. */
	const w = parsed as Partial<Record<keyof WireV1, unknown>>;
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
	if (
		typeof w.l === 'string' &&
		w.l.length <= MAX_LOGO_DATA_URL_LEN &&
		LOGO_DATA_URL_RE.test(w.l)
	) {
		out.logoDataUrl = w.l;
	}
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
	if (isOneOf(w.pnp, PNG_SIZE_VALUES)) out.pngSize = w.pnp;

	return out;
}

/* Session-storage wrappers. localStorage stores the wire payload
 * WITHOUT the `s=` URL-fragment prefix so the stored string and the
 * URL hash representation can diverge if we ever change either. Owning
 * both the encode + decode sides here keeps Generator.svelte from
 * knowing the wire-format key. The encode side still applies the
 * logo-drop rule so a session restored later is round-trippable to a
 * shareable URL without the user losing a logo silently. */
export function encodeSession<T extends ContentType>(state: PermalinkState<T>): string {
	const { hash } = encodePermalink(state, '');
	return hash.slice(2); /* strip the 's=' prefix */
}

export function decodeSession(raw: string): DecodedPermalink | null {
	return decodePermalink(`s=${raw}`);
}
