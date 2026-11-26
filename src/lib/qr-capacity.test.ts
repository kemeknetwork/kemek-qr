import { describe, it, expect } from 'vitest';
import { capacityVersionFor, overCapacityAdvice, qrModeOf } from './qr-capacity';

const bytes = (n: number) => 'a'.repeat(n);
const digits = (n: number) => '7'.repeat(n);
const alnum = (n: number) => 'A'.repeat(n);

/* ISO/IEC 18004 byte-mode capacity, [L, M, Q, H] for versions 1..40 —
 * the published table this module used before it went mode-aware. Kept
 * as an independent check on the data-codeword table it now derives
 * capacities from: one codeword off anywhere moves a boundary here. */
const BYTE_CAPACITY = [
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
] as const;
const LEVELS = ['L', 'M', 'Q', 'H'] as const;

describe('qrModeOf', () => {
	it.each([
		['0123456789', 'Numeric'],
		['HTTPS://KEMEK.COM/QR', 'Alphanumeric'],
		['ABC $%*+-./:', 'Alphanumeric'],
		['https://kemek.com', 'Byte'],
		['12a', 'Byte'],
		/* UTF-8 bytes of non-ASCII text are all 0x80 and up. */
		['Ã©', 'Byte']
	] as const)('%s → %s', (data, mode) => {
		expect(qrModeOf(data)).toBe(mode);
	});
});

describe('capacityVersionFor', () => {
	it('returns v1 for an empty payload at any ECC', () => {
		for (const ecc of LEVELS) expect(capacityVersionFor('', ecc)).toBe(1);
	});

	it('matches the published byte-mode table at every version boundary', () => {
		BYTE_CAPACITY.forEach((row, i) => {
			LEVELS.forEach((ecc, j) => {
				expect(capacityVersionFor(bytes(row[j]), ecc)).toBe(i + 1);
				expect(capacityVersionFor(bytes(row[j] + 1), ecc)).toBe(i < 39 ? i + 2 : null);
			});
		});
	});

	/* Published version-1 and version-40 maxima for the other two modes. */
	it.each([
		['numeric', digits, [41, 34, 27, 17], [7089, 5596, 3993, 3057]],
		['alphanumeric', alnum, [25, 20, 16, 10], [4296, 3391, 2420, 1852]]
	] as const)('holds the published %s maxima', (_, make, v1, v40) => {
		LEVELS.forEach((ecc, j) => {
			expect(capacityVersionFor(make(v1[j]), ecc)).toBe(1);
			expect(capacityVersionFor(make(v1[j] + 1), ecc)).toBe(2);
			expect(capacityVersionFor(make(v40[j]), ecc)).toBe(40);
			expect(capacityVersionFor(make(v40[j] + 1), ecc)).toBeNull();
		});
	});

	/* The reviewer's case: as bytes, 28 chars need v3 at both M and Q, so
	 * AUTO took Q "for free" — but as digits M fits v1 and Q needs v2. */
	it('sizes digits as digits, not bytes', () => {
		expect(capacityVersionFor(digits(28), 'M')).toBe(1);
		expect(capacityVersionFor(digits(28), 'Q')).toBe(2);
		expect(capacityVersionFor(bytes(28), 'M')).toBe(3);
	});
});

/* Version-40 maxima in byte mode: L 2953, M 2331, Q 1663, H 1273. */
describe('overCapacityAdvice', () => {
	const LOGO = 'Shorten it, or remove the logo to draw one.';
	const ECC = 'Shorten it, or lower the error correction to draw one.';
	const SHORTEN = 'Shorten it to draw one.';

	it.each([
		['a logo forces H and the text fits M without it', bytes(2331), 'H', true, LOGO],
		['a logo forces H, too long for M but fits L', bytes(2332), 'H', true, ECC],
		['H chosen by hand, fits a lower level', bytes(2000), 'H', false, ECC],
		['AUTO at M, fits L', bytes(2953), 'M', false, ECC],
		['past L at every setting', bytes(2954), 'M', false, SHORTEN],
		['past L with a logo', bytes(2954), 'H', true, SHORTEN],
		['already at L', bytes(3000), 'L', false, SHORTEN],
		/* Past every byte-mode limit, but digits fit L (7089) — sized as
		 * bytes, this advice dropped the lever that works. */
		['digits past M that fit L', digits(6000), 'M', false, ECC]
	] as const)('%s', (_, data, ecc, logoForcesH, advice) => {
		expect(overCapacityAdvice(data, ecc, logoForcesH)).toBe(advice);
	});
});
