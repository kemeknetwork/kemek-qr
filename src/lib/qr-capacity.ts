/* What fits in one QR code, per ISO/IEC 18004.
 *
 * qrcode-generator (inside qr-code-styling) packs the whole payload in
 * one mode: numeric for digits only, alphanumeric for 0-9 A-Z and
 * ` $%*+-./:` only, byte for anything else. The mode sets how many
 * characters a version holds (version 1 at M: 34 digits, 20
 * alphanumerics, 14 bytes), so sizing every payload as bytes put
 * digit-only and upper-case text in too large a version, and AUTO's
 * "stronger level at the same version" upgrade then cost a version.
 * qrModeOf picks the mode here and buildOpts hands that mode to the
 * library, so the sizing and the drawing use the same mode. */

/* Data codewords per (version, ECC), [L, M, Q, H] for versions 1..40
 * (the standard's capacity table; frozen). The published byte-mode
 * capacities in qr-capacity.test.ts are derived from these, and the
 * library test checks the version boundaries against the encoder. */
const DATA_CODEWORDS: readonly (readonly [number, number, number, number])[] = [
	[19, 16, 13, 9],
	[34, 28, 22, 16],
	[55, 44, 34, 26],
	[80, 64, 48, 36],
	[108, 86, 62, 46],
	[136, 108, 76, 60],
	[156, 124, 88, 66],
	[194, 154, 110, 86],
	[232, 182, 132, 100],
	[274, 216, 154, 122],
	[324, 254, 180, 140],
	[370, 290, 206, 158],
	[428, 334, 244, 180],
	[461, 365, 261, 197],
	[523, 415, 295, 223],
	[589, 453, 325, 253],
	[647, 507, 367, 283],
	[721, 563, 397, 313],
	[795, 627, 445, 341],
	[861, 669, 485, 385],
	[932, 714, 512, 406],
	[1006, 782, 568, 442],
	[1094, 860, 614, 464],
	[1174, 914, 664, 514],
	[1276, 1000, 718, 538],
	[1370, 1062, 754, 596],
	[1468, 1128, 808, 628],
	[1531, 1193, 871, 661],
	[1631, 1267, 911, 701],
	[1735, 1373, 985, 745],
	[1843, 1455, 1033, 793],
	[1955, 1541, 1115, 845],
	[2071, 1631, 1171, 901],
	[2191, 1725, 1231, 961],
	[2306, 1812, 1286, 986],
	[2434, 1914, 1354, 1054],
	[2566, 1992, 1426, 1096],
	[2702, 2102, 1502, 1142],
	[2812, 2216, 1582, 1222],
	[2956, 2334, 1666, 1276]
];

const ECC_INDEX = { L: 0, M: 1, Q: 2, H: 3 } as const;

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

/* The library's own names, so the value passes straight through as
 * `qrOptions.mode`. Kanji is never picked. */
export type QrMode = 'Numeric' | 'Alphanumeric' | 'Byte';

/* `data` is the string the library draws: one char per byte
 * (toQrByteString), so UTF-8 text always lands in byte mode. These are
 * the library's own tests, in its order. */
export function qrModeOf(data: string): QrMode {
	if (/^[0-9]*$/.test(data)) return 'Numeric';
	if (/^[0-9A-Z $%*+\-./:]*$/.test(data)) return 'Alphanumeric';
	return 'Byte';
}

/* Character-count field width, which grows at versions 10 and 27. */
function countBits(mode: QrMode, version: number): number {
	const band = version < 10 ? 0 : version < 27 ? 1 : 2;
	if (mode === 'Numeric') return [10, 12, 14][band];
	if (mode === 'Alphanumeric') return [9, 11, 13][band];
	return [8, 16, 16][band];
}

/* Numeric packs 3 digits in 10 bits (a trailing 1 or 2 in 4 or 7);
 * alphanumeric 2 chars in 11 bits (a trailing 1 in 6); byte 8 each. */
function payloadBits(mode: QrMode, length: number): number {
	if (mode === 'Numeric') return Math.floor(length / 3) * 10 + [0, 4, 7][length % 3];
	if (mode === 'Alphanumeric') return Math.floor(length / 2) * 11 + (length % 2) * 6;
	return length * 8;
}

/* Smallest QR version (1..40) that holds `data` at the given ECC, in
 * the mode qrModeOf picks: the version the library draws. Returns null
 * when it exceeds version 40 at that level — the encoder then fails
 * regardless, and resolveEcc keeps the M default rather than picking a
 * tighter level that also wouldn't fit. */
export function capacityVersionFor(data: string, ecc: EccLevel): number | null {
	const mode = qrModeOf(data);
	const bits = payloadBits(mode, data.length);
	const idx = ECC_INDEX[ecc];
	for (let v = 1; v <= DATA_CODEWORDS.length; v++) {
		/* 4 bits of mode indicator lead the segment. */
		if (4 + countBits(mode, v) + bits <= DATA_CODEWORDS[v - 1][idx] * 8) return v;
	}
	return null;
}

/* The fix to offer someone whose text overflowed one QR code at `ecc`.
 * A second lever is named only when the text provably fits once it is
 * pulled, so the advice is never wrong; when none does, shortening is
 * the only fix. `logoForcesH` is AUTO with a logo, where removing the
 * logo drops the level to M on its own. */
export function overCapacityAdvice(data: string, ecc: EccLevel, logoForcesH: boolean): string {
	if (logoForcesH && capacityVersionFor(data, 'M') !== null)
		return 'Shorten it, or remove the logo to draw one.';
	if (ecc !== 'L' && capacityVersionFor(data, 'L') !== null)
		return 'Shorten it, or lower the error correction to draw one.';
	return 'Shorten it to draw one.';
}
