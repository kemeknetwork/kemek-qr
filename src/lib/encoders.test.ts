import { describe, it, expect } from 'vitest';
import {
	encode,
	encodeEmail,
	encodeGeo,
	encodePhone,
	encodeSms,
	encodeText,
	encodeUrl,
	encodeVCard,
	encodeWifi
} from './encoders';
import { CONTENT_TYPES, type ContentMap, type ContentType } from './types';

describe('encodeUrl', () => {
	it('returns the trimmed URL string', () => {
		expect(encodeUrl({ url: '  https://kemek.com  ' })).toBe('https://kemek.com');
	});
	it('preserves an empty string', () => {
		expect(encodeUrl({ url: '' })).toBe('');
	});
});

describe('encodeText', () => {
	it('passes through arbitrary text including special chars', () => {
		expect(encodeText({ text: 'hello; "world", line\nbreak' })).toBe('hello; "world", line\nbreak');
	});
});

describe('encodeWifi', () => {
	it('emits a WIFI string with WPA, hidden=false', () => {
		expect(encodeWifi({ ssid: 'KemekNet', password: 'hunter2', auth: 'WPA', hidden: false })).toBe(
			'WIFI:T:WPA;S:KemekNet;P:hunter2;H:;;'
		);
	});
	it('emits hidden=true', () => {
		expect(encodeWifi({ ssid: 'KemekNet', password: 'hunter2', auth: 'WPA', hidden: true })).toBe(
			'WIFI:T:WPA;S:KemekNet;P:hunter2;H:true;;'
		);
	});
	it('omits password for nopass', () => {
		expect(
			encodeWifi({ ssid: 'OpenNet', password: 'whatever', auth: 'nopass', hidden: false })
		).toBe('WIFI:T:nopass;S:OpenNet;P:;H:;;');
	});
	it('escapes ; , : " \\ in ssid and password', () => {
		expect(
			encodeWifi({
				ssid: 'a;b,c:d"e\\f',
				password: 'p;p',
				auth: 'WPA',
				hidden: false
			})
		).toBe('WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;p;H:;;');
	});
	it('handles WEP', () => {
		expect(encodeWifi({ ssid: 'old', password: 'k', auth: 'WEP', hidden: false })).toBe(
			'WIFI:T:WEP;S:old;P:k;H:;;'
		);
	});
});

describe('encodeVCard', () => {
	it('emits a minimal vCard with required wrappers and FN', () => {
		const out = encodeVCard({
			firstName: 'Ada',
			lastName: 'Lovelace',
			org: '',
			title: '',
			phone: '',
			email: '',
			url: '',
			address: ''
		});
		expect(out).toContain('BEGIN:VCARD');
		expect(out).toContain('VERSION:3.0');
		expect(out).toContain('FN:Ada Lovelace');
		expect(out).toContain('N:Lovelace;Ada;;;');
		expect(out).toContain('END:VCARD');
	});
	it('includes only set fields', () => {
		const out = encodeVCard({
			firstName: 'Ada',
			lastName: '',
			org: 'KeMeK',
			title: '',
			phone: '+15551234567',
			email: 'ada@example.org',
			url: '',
			address: ''
		});
		expect(out).toContain('ORG:KeMeK');
		expect(out).toContain('TEL;TYPE=CELL:+15551234567');
		expect(out).toContain('EMAIL:ada@example.org');
		expect(out).not.toContain('TITLE');
		expect(out).not.toContain('URL:');
		expect(out).not.toContain('ADR:');
	});
	it('escapes ; , and \\ in field values', () => {
		const out = encodeVCard({
			firstName: 'A;B',
			lastName: 'C,D',
			org: 'x\\y',
			title: '',
			phone: '',
			email: '',
			url: '',
			address: ''
		});
		expect(out).toContain('FN:A\\;B C\\,D');
		expect(out).toContain('N:C\\,D;A\\;B;;;');
		expect(out).toContain('ORG:x\\\\y');
	});
});

describe('encodeEmail', () => {
	it('emits bare mailto:', () => {
		expect(encodeEmail({ to: 'a@b.com', subject: '', body: '' })).toBe('mailto:a%40b.com');
	});
	it('appends subject and body when set', () => {
		expect(encodeEmail({ to: 'a@b.com', subject: 'hi', body: 'note' })).toBe(
			'mailto:a%40b.com?subject=hi&body=note'
		);
	});
	it('URL-encodes special characters', () => {
		expect(encodeEmail({ to: 'a@b.com', subject: 'a b', body: 'x&y' })).toBe(
			'mailto:a%40b.com?subject=a%20b&body=x%26y'
		);
	});
});

describe('encodeSms', () => {
	it('emits SMSTO with empty body', () => {
		expect(encodeSms({ number: '+15551234567', body: '' })).toBe('SMSTO:+15551234567:');
	});
	it('emits SMSTO with body', () => {
		expect(encodeSms({ number: '+1 555 123 4567', body: 'hello' })).toBe(
			'SMSTO:+15551234567:hello'
		);
	});
});

describe('encodePhone', () => {
	it('emits tel: stripping whitespace', () => {
		expect(encodePhone({ number: '+1 555 123 4567' })).toBe('tel:+15551234567');
	});
});

describe('encodeGeo', () => {
	it('emits bare geo: when no query', () => {
		expect(encodeGeo({ lat: '40.7128', lon: '-74.0060', query: '' })).toBe('geo:40.7128,-74.0060');
	});
	it('appends ?q= when query is set', () => {
		expect(encodeGeo({ lat: '40.7128', lon: '-74.0060', query: 'Statue of Liberty' })).toBe(
			'geo:40.7128,-74.0060?q=Statue%20of%20Liberty'
		);
	});
});

describe('encode dispatcher', () => {
	it('routes to the matching encoder for each type', () => {
		expect(encode('url', { url: 'https://x' })).toBe('https://x');
		expect(encode('phone', { number: '+1' })).toBe('tel:+1');
		expect(encode('text', { text: 'plain' })).toBe('plain');
	});

	/* A share link's JSON can carry half a surrogate pair. Built at
	 * runtime so no editor or transport can normalise it away. */
	const half = String.fromCharCode(0xd800) + 'x' + String.fromCharCode(0xdc00);
	const replaced = '�x�';
	const everyField = (s: string): { [T in ContentType]: ContentMap[T] } => ({
		url: { url: s },
		text: { text: s },
		wifi: { ssid: s, password: s, auth: 'WPA', hidden: true },
		vcard: {
			firstName: s,
			lastName: s,
			org: s,
			title: s,
			phone: s,
			email: s,
			url: s,
			address: s
		},
		email: { to: s, subject: s, body: s },
		sms: { number: s, body: s },
		phone: { number: s },
		geo: { lat: s, lon: s, query: s }
	});
	it.each(CONTENT_TYPES)(
		'never throws on a lone surrogate, and emits well-formed text (%s)',
		(type) => {
			/* The built-in check, not a UTF-8 round trip: that is what encode
			 * itself uses, so it would share any blind spot of the fix. */
			expect(encode(type, everyField(half)[type]).isWellFormed()).toBe(true);
		}
	);

	/* Well-formed text must come out exactly as the encoder alone would
	 * write it. A leading U+FEFF is in the sample because a default
	 * TextDecoder strips one, which would silently change a WiFi SSID. */
	const direct: { [T in ContentType]: (c: ContentMap[T]) => string } = {
		url: encodeUrl,
		text: encodeText,
		wifi: encodeWifi,
		vcard: encodeVCard,
		email: encodeEmail,
		sms: encodeSms,
		phone: encodePhone,
		geo: encodeGeo
	};
	const sample = everyField(String.fromCharCode(0xfeff) + 'Zoë’s café — ✓ 😀 中文');
	function viaBoth<T extends ContentType>(type: T): [string, string] {
		return [encode(type, sample[type]), direct[type](sample[type])];
	}

	it.each(CONTENT_TYPES)(
		'passes well-formed text through unchanged, a leading U+FEFF included (%s)',
		(type) => {
			const [dispatched, alone] = viaBoth(type);
			expect(dispatched).toBe(alone);
		}
	);

	it('replaces a stray half with U+FFFD, as TextEncoder would', () => {
		expect(encode('text', { text: half })).toBe(replaced);
		expect(encode('email', { to: half, subject: '', body: '' })).toBe(
			`mailto:${encodeURIComponent(replaced)}`
		);
	});

	it('does not mutate the content it was given', () => {
		const content = { text: half };
		encode('text', content);
		expect(content.text).toBe(half);
	});
});
