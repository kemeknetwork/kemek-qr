import { describe, it, expect } from 'vitest';
import {
	parseHex,
	relativeLuminance,
	contrastRatio,
	isInverted,
	effectiveFg,
	contrastBand
} from './contrast';

describe('parseHex', () => {
	it('parses #RRGGBB', () => {
		expect(parseHex('#1A2B3C')).toEqual([0x1a, 0x2b, 0x3c]);
	});
	it('parses 3-digit shorthand', () => {
		expect(parseHex('#abc')).toEqual([0xaa, 0xbb, 0xcc]);
	});
	it('parses without leading #', () => {
		expect(parseHex('ffffff')).toEqual([255, 255, 255]);
	});
	it('returns null for garbage', () => {
		expect(parseHex('not-a-color')).toBeNull();
		expect(parseHex('#xyz')).toBeNull();
		expect(parseHex('')).toBeNull();
	});
});

describe('relativeLuminance', () => {
	it('black is 0', () => {
		expect(relativeLuminance('#000000')).toBe(0);
	});
	it('white is 1', () => {
		expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 4);
	});
	it('mid-gray sits between', () => {
		const L = relativeLuminance('#808080')!;
		expect(L).toBeGreaterThan(0.2);
		expect(L).toBeLessThan(0.3);
	});
});

describe('contrastRatio', () => {
	it('black on white is 21:1', () => {
		expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
	});
	it('same color is 1:1', () => {
		expect(contrastRatio('#7A3F5C', '#7A3F5C')).toBeCloseTo(1, 4);
	});
	it('order-independent (commutative)', () => {
		const a = contrastRatio('#1A1815', '#F2EBDD')!;
		const b = contrastRatio('#F2EBDD', '#1A1815')!;
		expect(a).toBeCloseTo(b, 6);
	});
	it('returns null for unparseable', () => {
		expect(contrastRatio('not-a-color', '#FFF')).toBeNull();
	});
});

describe('isInverted', () => {
	it('dark fg on light bg is not inverted', () => {
		expect(isInverted('#1A1815', '#F2EBDD')).toBe(false);
	});
	it('light fg on dark bg is inverted', () => {
		expect(isInverted('#F2EBDD', '#1A1815')).toBe(true);
	});
	it('same color is not inverted (strict >)', () => {
		expect(isInverted('#808080', '#808080')).toBe(false);
	});
});

describe('effectiveFg', () => {
	it('returns fgColor when gradient is off', () => {
		expect(effectiveFg('#1A1815', false, '#000', '#fff', '#F2EBDD')).toBe('#1A1815');
	});
	it('picks gradient stop closest to bg luminance (worst-case)', () => {
		/* black→pale-pink on white: pale-pink has higher luminance,
		 * closer to white bg → it's the worst-case stop. */
		expect(effectiveFg('#000', true, '#000000', '#FFC0CB', '#FFFFFF')).toBe('#FFC0CB');
	});
	it('picks the other gradient stop when bg is dark', () => {
		/* black→pale-pink on dark: black is closer to dark bg, the
		 * worst case. */
		expect(effectiveFg('#000', true, '#000000', '#FFC0CB', '#222222')).toBe('#000000');
	});
});

describe('contrastBand', () => {
	it('high contrast = ok', () => {
		expect(contrastBand(21, false)).toBe('ok');
	});
	it('below 3:1 = low', () => {
		expect(contrastBand(2.5, false)).toBe('low');
	});
	it('inverted overrides low', () => {
		expect(contrastBand(1.4, true)).toBe('inverted');
	});
	it('inverted overrides high contrast too', () => {
		expect(contrastBand(15, true)).toBe('inverted');
	});
	it('null ratio defaults to ok (not parseable yet)', () => {
		expect(contrastBand(null, false)).toBe('ok');
	});
});
