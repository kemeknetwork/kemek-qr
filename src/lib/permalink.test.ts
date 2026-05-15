import { describe, it, expect } from 'vitest';
import {
	decodePermalink,
	decodeSession,
	encodePermalink,
	encodeSession,
	type PermalinkState
} from './permalink';

const baseStyling = {
	fg: '#1A1815',
	bg: '#F2EBDD',
	dot: 'rounded' as const,
	ecc: 'auto' as const,
	logoSize: 0.25,
	logoDataUrl: null,
	gradientEnabled: false,
	gradientFrom: '#1A1815',
	gradientTo: '#C53A1F',
	gradientAngle: 45,
	eyeFrame: 'square' as const,
	eyeBall: 'square' as const,
	frameEnabled: false,
	frameLabel: 'SCAN ME',
	frameLabelSize: 'M' as const,
	frameLabelFont: 'mono' as const,
	pngSize: '1K' as const
};

describe('encode → decode round trip', () => {
	it('preserves URL state with no logo', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' }
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.logoDropped).toBe(false);
		const dec = decodePermalink(enc.hash);
		expect(dec).not.toBeNull();
		expect(dec?.type).toBe('url');
		expect(dec?.content).toEqual({ url: 'https://kemek.com' });
		expect(dec?.fg).toBe('#1A1815');
		expect(dec?.dot).toBe('rounded');
	});

	it('preserves WiFi state', () => {
		const state: PermalinkState<'wifi'> = {
			...baseStyling,
			type: 'wifi',
			content: { ssid: 'NetA', password: 'p1', auth: 'WPA', hidden: false }
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		const dec = decodePermalink(enc.hash);
		expect(dec?.type).toBe('wifi');
		expect(dec?.content).toEqual({
			ssid: 'NetA',
			password: 'p1',
			auth: 'WPA',
			hidden: false
		});
	});

	it('drops logo when total URL exceeds the limit', () => {
		const bigDataUrl = `data:image/png;base64,${'A'.repeat(7000)}`;
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' },
			logoDataUrl: bigDataUrl
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.logoDropped).toBe(true);
		const dec = decodePermalink(enc.hash);
		expect(dec?.logoDataUrl).toBeUndefined();
	});

	it('keeps a small logo when it fits', () => {
		const smallDataUrl = `data:image/png;base64,${'A'.repeat(120)}`;
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' },
			logoDataUrl: smallDataUrl
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.logoDropped).toBe(false);
		const dec = decodePermalink(enc.hash);
		expect(dec?.logoDataUrl).toBe(smallDataUrl);
	});
});

describe('styling fields', () => {
	it('round-trips gradient + frame fields when enabled', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' },
			gradientEnabled: true,
			gradientFrom: '#000000',
			gradientTo: '#FF0000',
			gradientAngle: 135,
			eyeFrame: 'extra-rounded',
			eyeBall: 'dot',
			frameEnabled: true,
			frameLabel: 'POINT YOUR PHONE'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		const dec = decodePermalink(enc.hash);
		expect(dec?.gradientEnabled).toBe(true);
		expect(dec?.gradientFrom).toBe('#000000');
		expect(dec?.gradientTo).toBe('#FF0000');
		expect(dec?.gradientAngle).toBe(135);
		expect(dec?.eyeFrame).toBe('extra-rounded');
		expect(dec?.eyeBall).toBe('dot');
		expect(dec?.frameEnabled).toBe(true);
		expect(dec?.frameLabel).toBe('POINT YOUR PHONE');
	});
	it('round-trips frameLabelSize when frame is enabled and size != M', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' },
			frameEnabled: true,
			frameLabel: 'SCAN ME',
			frameLabelSize: 'XL'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		const dec = decodePermalink(enc.hash);
		expect(dec?.frameLabelSize).toBe('XL');
	});
	it('round-trips pngSize when set to a non-default bucket', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' },
			pngSize: '4K'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		const dec = decodePermalink(enc.hash);
		expect(dec?.pngSize).toBe('4K');
	});
	it('omits pngSize when default (1K) to keep links short', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'x' },
			pngSize: '1K'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.hash).not.toContain('pnp');
		const dec = decodePermalink(enc.hash);
		expect(dec?.pngSize).toBeUndefined();
	});
	it('omits frameLabelSize when default (M) to keep links short', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'x' },
			frameEnabled: true,
			frameLabel: 'SCAN ME',
			frameLabelSize: 'M'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.hash).not.toContain('fls');
		const dec = decodePermalink(enc.hash);
		expect(dec?.frameLabelSize).toBeUndefined();
	});
	it('round-trips frameLabelFont when frame is enabled and font != mono', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' },
			frameEnabled: true,
			frameLabel: 'SCAN ME',
			frameLabelFont: 'display'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		const dec = decodePermalink(enc.hash);
		expect(dec?.frameLabelFont).toBe('display');
	});
	it('omits frameLabelFont when default (mono) to keep links short', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'x' },
			frameEnabled: true,
			frameLabel: 'SCAN ME',
			frameLabelFont: 'mono'
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.hash).not.toContain('flf');
		const dec = decodePermalink(enc.hash);
		expect(dec?.frameLabelFont).toBeUndefined();
	});
	it('omits gradient fields when disabled (keeps default-state links short)', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'x' },
			gradientEnabled: false
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		expect(enc.hash).not.toContain('gf');
		const dec = decodePermalink(enc.hash);
		expect(dec?.gradientEnabled).toBeUndefined();
	});
});

describe('decode validation', () => {
	it('returns null on malformed hash', () => {
		expect(decodePermalink('#nope')).toBeNull();
		expect(decodePermalink('#s=v9.garbage')).toBeNull();
		expect(decodePermalink('#s=v1.@@@')).toBeNull();
	});
	it('drops invalid fields without rejecting the whole payload', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			fg: '#1A1815',
			type: 'url',
			content: { url: 'https://kemek.com' }
		};
		const enc = encodePermalink(state, 'https://qr.kemek.com/');
		// corrupt the encoded payload's fg by re-encoding with a bad value
		const corruptHash = `#s=v1.${btoa(
			JSON.stringify({ t: 'url', c: { url: 'x' }, f: 'not-a-color', d: 'rounded' })
		)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')}`;
		const dec = decodePermalink(corruptHash);
		expect(dec).not.toBeNull();
		expect(dec?.type).toBe('url');
		expect(dec?.dot).toBe('rounded');
		expect(dec?.fg).toBeUndefined();
	});
	it('strips unknown content keys', () => {
		const corruptHash = `#s=v1.${btoa(
			JSON.stringify({
				t: 'wifi',
				c: { ssid: 'x', password: 'y', auth: 'WPA', hidden: false, secret: 'leak' }
			})
		)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')}`;
		const dec = decodePermalink(corruptHash);
		expect(dec?.content).not.toHaveProperty('secret');
		expect(dec?.content).toEqual({
			ssid: 'x',
			password: 'y',
			auth: 'WPA',
			hidden: false
		});
	});
	it('drops content keys whose scalar type mismatches the default', () => {
		/* Crafted (or merely corrupted) permalinks could deliver a number
		 * where the encoder expects a string. Pre-0.34.20 this passed
		 * through and crashed encoder methods like encodePhone's
		 * .number.replace() inside the debounced render effect. */
		const corruptHash = `#s=v1.${btoa(
			JSON.stringify({
				t: 'phone',
				c: { number: 12345 } /* number, not string */
			})
		)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')}`;
		const dec = decodePermalink(corruptHash);
		expect(dec?.type).toBe('phone');
		expect(dec?.content).toEqual({}); /* number stripped, no crash */
	});
	it('drops content boolean keys with wrong scalar type', () => {
		const corruptHash = `#s=v1.${btoa(
			JSON.stringify({
				t: 'wifi',
				c: { ssid: 'x', password: 'y', auth: 'WPA', hidden: 'yes' } /* string, expected boolean */
			})
		)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')}`;
		const dec = decodePermalink(corruptHash);
		expect(dec?.content).toEqual({ ssid: 'x', password: 'y', auth: 'WPA' });
		expect(dec?.content).not.toHaveProperty('hidden');
	});
});

describe('session storage round-trip', () => {
	it('encodeSession + decodeSession round-trips without the s= prefix', () => {
		const state: PermalinkState<'url'> = {
			...baseStyling,
			type: 'url',
			content: { url: 'https://kemek.com' }
		};
		const raw = encodeSession(state);
		expect(raw.startsWith('s=')).toBe(false);
		expect(raw.startsWith('v1.')).toBe(true);
		const dec = decodeSession(raw);
		expect(dec?.type).toBe('url');
		expect(dec?.content).toEqual({ url: 'https://kemek.com' });
		expect(dec?.fg).toBe('#1A1815');
	});
});
