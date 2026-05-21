import { describe, it, expect } from 'vitest';
import { capacityVersionFor } from './qr-capacity';

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
