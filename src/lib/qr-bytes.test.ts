import { describe, expect, it } from 'vitest';
import { toQrByteString } from './qr-bytes';

const codes = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe('toQrByteString', () => {
	it('leaves ASCII untouched, so numeric/alphanumeric mode detection is unchanged', () => {
		expect(toQrByteString('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
		expect(toQrByteString('+15551234567')).toBe('+15551234567');
	});

	it('spells characters above U+00FF as their UTF-8 bytes', () => {
		expect(codes(toQrByteString('✓'))).toEqual([0xe2, 0x9c, 0x93]);
		expect(codes(toQrByteString('’'))).toEqual([0xe2, 0x80, 0x99]);
		expect(codes(toQrByteString('😀'))).toEqual([0xf0, 0x9f, 0x98, 0x80]);
	});

	it('encodes Latin-1 as UTF-8 too, not as single ISO-8859-1 bytes', () => {
		expect(codes(toQrByteString('é'))).toEqual([0xc3, 0xa9]);
	});

	it('only ever emits byte-sized code units, so the library cannot truncate them', () => {
		const out = toQrByteString('Привет, 世界 — “quoted” ✓ 😀');
		expect(Math.max(...codes(out))).toBeLessThanOrEqual(0xff);
	});

	it('round-trips through a UTF-8 decode and matches the TextEncoder length', () => {
		for (const s of ['', 'plain', 'Zoë’s café — €5 ✓', '中文 русский 😀']) {
			const out = toQrByteString(s);
			expect(out.length).toBe(new TextEncoder().encode(s).length);
			expect(new TextDecoder().decode(Uint8Array.from(codes(out)))).toBe(s);
		}
	});
});
