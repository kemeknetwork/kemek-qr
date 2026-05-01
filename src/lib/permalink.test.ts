import { describe, it, expect } from 'vitest';
import { decodePermalink, encodePermalink, type PermalinkState } from './permalink';

const baseStyling = {
	fg: '#1A1815',
	bg: '#F2EBDD',
	dot: 'rounded' as const,
	ecc: 'auto' as const,
	logoSize: 0.25,
	logoDataUrl: null
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
});
