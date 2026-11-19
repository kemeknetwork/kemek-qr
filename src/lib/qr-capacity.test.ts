import { describe, it, expect } from 'vitest';
import { capacityVersionFor, overCapacityAdvice } from './qr-capacity';

describe('capacityVersionFor', () => {
	it('returns v1 for an empty payload at any ECC', () => {
		expect(capacityVersionFor(0, 'L')).toBe(1);
		expect(capacityVersionFor(0, 'M')).toBe(1);
		expect(capacityVersionFor(0, 'Q')).toBe(1);
		expect(capacityVersionFor(0, 'H')).toBe(1);
	});

	it('returns v1 at the v1 capacity boundary', () => {
		expect(capacityVersionFor(7, 'H')).toBe(1);
		expect(capacityVersionFor(11, 'Q')).toBe(1);
		expect(capacityVersionFor(14, 'M')).toBe(1);
		expect(capacityVersionFor(17, 'L')).toBe(1);
	});

	it('jumps to v2 one byte past the v1 boundary', () => {
		expect(capacityVersionFor(8, 'H')).toBe(2);
		expect(capacityVersionFor(12, 'Q')).toBe(2);
		expect(capacityVersionFor(15, 'M')).toBe(2);
		expect(capacityVersionFor(18, 'L')).toBe(2);
	});

	it('returns v40 at the v40 capacity boundary', () => {
		expect(capacityVersionFor(1273, 'H')).toBe(40);
		expect(capacityVersionFor(1663, 'Q')).toBe(40);
		expect(capacityVersionFor(2331, 'M')).toBe(40);
		expect(capacityVersionFor(2953, 'L')).toBe(40);
	});

	it('returns null when the payload exceeds v40 capacity', () => {
		expect(capacityVersionFor(1274, 'H')).toBeNull();
		expect(capacityVersionFor(2332, 'M')).toBeNull();
		expect(capacityVersionFor(10_000, 'L')).toBeNull();
	});
});

/* Version-40 maxima: L 2953, M 2331, Q 1663, H 1273 bytes. */
describe('overCapacityAdvice', () => {
	const LOGO = 'Shorten it, or remove the logo to draw one.';
	const ECC = 'Shorten it, or lower the error correction to draw one.';
	const SHORTEN = 'Shorten it to draw one.';

	it.each([
		['a logo forces H and the text fits M without it', 2331, 'H', true, LOGO],
		['a logo forces H, too long for M but fits L', 2332, 'H', true, ECC],
		['H chosen by hand, fits a lower level', 2000, 'H', false, ECC],
		['AUTO at M, fits L', 2953, 'M', false, ECC],
		['past L at every setting', 2954, 'M', false, SHORTEN],
		['past L with a logo', 2954, 'H', true, SHORTEN],
		['already at L', 3000, 'L', false, SHORTEN]
	] as const)('%s', (_, bytes, ecc, logoForcesH, advice) => {
		expect(overCapacityAdvice(bytes, ecc, logoForcesH)).toBe(advice);
	});
});
