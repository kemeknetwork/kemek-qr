/* ISO/IEC 18004 byte-mode capacity, max payload bytes per (version, ECC).
 *
 * Each row is [L, M, Q, H] for versions 1..40. Frozen by the spec — no
 * maintenance risk; published in Table 7 of the standard. Byte-mode is
 * the worst-case mode: real encoders may use numeric/alphanumeric mode
 * mixing for payloads of digits or upper-case ASCII to fit more data in
 * a smaller version, so this is a conservative upper bound on the
 * actual encoded version.
 *
 * Used by resolveEcc to pick the strongest ECC level that fits in the
 * same minimum version as M, giving short payloads a free recovery
 * bump (M→Q or M→H) with no module-count penalty. */
const BYTE_CAPACITY: readonly (readonly [number, number, number, number])[] = [
	[17, 14, 11, 7],
	[32, 26, 20, 14],
	[53, 42, 32, 24],
	[78, 62, 46, 34],
	[106, 84, 60, 44],
	[134, 106, 74, 58],
	[154, 122, 86, 64],
	[192, 152, 108, 84],
	[230, 180, 130, 98],
	[271, 213, 151, 119],
	[321, 251, 177, 137],
	[367, 287, 203, 155],
	[425, 331, 241, 177],
	[458, 362, 258, 194],
	[520, 412, 292, 220],
	[586, 450, 322, 250],
	[644, 504, 364, 280],
	[718, 560, 394, 310],
	[792, 624, 442, 338],
	[858, 666, 482, 382],
	[929, 711, 509, 403],
	[1003, 779, 565, 439],
	[1091, 857, 611, 461],
	[1171, 911, 661, 511],
	[1273, 997, 715, 535],
	[1367, 1059, 751, 593],
	[1465, 1125, 805, 625],
	[1528, 1190, 868, 658],
	[1628, 1264, 908, 698],
	[1732, 1370, 982, 742],
	[1840, 1452, 1030, 790],
	[1952, 1538, 1112, 842],
	[2068, 1628, 1168, 898],
	[2188, 1722, 1228, 958],
	[2303, 1809, 1283, 983],
	[2431, 1911, 1351, 1051],
	[2563, 1989, 1423, 1093],
	[2699, 2099, 1499, 1139],
	[2809, 2213, 1579, 1219],
	[2953, 2331, 1663, 1273]
];

const ECC_INDEX = { L: 0, M: 1, Q: 2, H: 3 } as const;

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

/* Smallest QR version (1..40) that holds `bytes` of byte-mode payload
 * at the given ECC level. Returns null when the payload exceeds v40
 * capacity at that level — the encoder will then fail to produce a
 * code regardless, and resolveEcc preserves the M default in that
 * case rather than picking a tighter level that also wouldn't fit. */
export function capacityVersionFor(bytes: number, ecc: EccLevel): number | null {
	const idx = ECC_INDEX[ecc];
	for (let v = 0; v < BYTE_CAPACITY.length; v++) {
		if (BYTE_CAPACITY[v][idx] >= bytes) return v + 1;
	}
	return null;
}

/* The fix to offer someone whose text overflowed one QR code at `ecc`.
 * A second lever is named only when this table, the worst case, proves
 * the text fits once it is pulled, so the advice is never wrong; when
 * none does, shortening is the only fix. `logoForcesH` is AUTO with a
 * logo, where removing the logo drops the level to M on its own. */
export function overCapacityAdvice(bytes: number, ecc: EccLevel, logoForcesH: boolean): string {
	if (logoForcesH && capacityVersionFor(bytes, 'M') !== null)
		return 'Shorten it, or remove the logo to draw one.';
	if (ecc !== 'L' && capacityVersionFor(bytes, 'L') !== null)
		return 'Shorten it, or lower the error correction to draw one.';
	return 'Shorten it to draw one.';
}
