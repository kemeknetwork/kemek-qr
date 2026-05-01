/* Pure encoders: ContentType payload → QR data string.
 *
 * Each function is total: empty/missing fields produce a syntactically
 * valid (if semantically empty) QR payload — never throws. The caller
 * decides whether the output is meaningful.
 *
 * Format references:
 *   WiFi:  WIFI:T:<auth>;S:<ssid>;P:<pwd>;H:<true|>;;
 *   vCard: RFC 6350 (using 3.0 for max scanner compatibility)
 *   Email: RFC 6068 (mailto:)
 *   SMS:   SMSTO:<number>:<body> (de-facto stock-app standard;
 *                                 sms: scheme is RFC 5724 but support varies)
 *   Phone: RFC 3966 (tel:)
 *   Geo:   RFC 5870 (geo:)
 */

import type {
	ContentMap,
	ContentType,
	EmailContent,
	GeoContent,
	PhoneContent,
	SmsContent,
	TextContent,
	UrlContent,
	VCardContent,
	WifiContent
} from './types';

/* WiFi field escape: backslash, semicolon, comma, colon, double-quote.
 * Per the de-facto standard implemented by Android/iOS scanners. */
function escapeWifi(s: string): string {
	return s.replace(/([\\;,:"])/g, '\\$1');
}

export function encodeUrl(c: UrlContent): string {
	return c.url.trim();
}

export function encodeText(c: TextContent): string {
	return c.text;
}

export function encodeWifi(c: WifiContent): string {
	const auth = c.auth === 'nopass' ? 'nopass' : c.auth;
	const ssid = escapeWifi(c.ssid);
	const password = c.auth === 'nopass' ? '' : escapeWifi(c.password);
	const hidden = c.hidden ? 'true' : '';
	return `WIFI:T:${auth};S:${ssid};P:${password};H:${hidden};;`;
}

/* vCard line escape: backslash, semicolon, comma, newlines per RFC 6350.
 * vCard 3.0 wraps long lines at 75 octets; we omit folding because most
 * scanners tolerate unfolded lines and folding bloats QR payload. */
function escapeVCard(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function encodeVCard(c: VCardContent): string {
	const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
	const fn = `${c.firstName} ${c.lastName}`.trim();
	if (fn) lines.push(`FN:${escapeVCard(fn)}`);
	if (c.lastName || c.firstName) {
		lines.push(`N:${escapeVCard(c.lastName)};${escapeVCard(c.firstName)};;;`);
	}
	if (c.org) lines.push(`ORG:${escapeVCard(c.org)}`);
	if (c.title) lines.push(`TITLE:${escapeVCard(c.title)}`);
	if (c.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(c.phone)}`);
	if (c.email) lines.push(`EMAIL:${escapeVCard(c.email)}`);
	if (c.url) lines.push(`URL:${escapeVCard(c.url)}`);
	if (c.address) lines.push(`ADR:;;${escapeVCard(c.address)};;;;`);
	lines.push('END:VCARD');
	return lines.join('\n');
}

export function encodeEmail(c: EmailContent): string {
	const to = encodeURIComponent(c.to.trim());
	const params: string[] = [];
	if (c.subject) params.push(`subject=${encodeURIComponent(c.subject)}`);
	if (c.body) params.push(`body=${encodeURIComponent(c.body)}`);
	const tail = params.length ? `?${params.join('&')}` : '';
	return `mailto:${to}${tail}`;
}

export function encodeSms(c: SmsContent): string {
	const num = c.number.replace(/\s/g, '');
	return c.body ? `SMSTO:${num}:${c.body}` : `SMSTO:${num}:`;
}

export function encodePhone(c: PhoneContent): string {
	return `tel:${c.number.replace(/\s/g, '')}`;
}

/* Geo: bare `geo:<lat>,<lon>` is RFC; `?q=` is a Google-Maps
 * convention many scanners honor. We emit q only when query is set
 * because some strict scanners reject the q parameter. */
export function encodeGeo(c: GeoContent): string {
	const lat = c.lat.trim();
	const lon = c.lon.trim();
	const base = `geo:${lat},${lon}`;
	return c.query ? `${base}?q=${encodeURIComponent(c.query)}` : base;
}

export function encode<T extends ContentType>(type: T, content: ContentMap[T]): string {
	switch (type) {
		case 'url':
			return encodeUrl(content as UrlContent);
		case 'text':
			return encodeText(content as TextContent);
		case 'wifi':
			return encodeWifi(content as WifiContent);
		case 'vcard':
			return encodeVCard(content as VCardContent);
		case 'email':
			return encodeEmail(content as EmailContent);
		case 'sms':
			return encodeSms(content as SmsContent);
		case 'phone':
			return encodePhone(content as PhoneContent);
		case 'geo':
			return encodeGeo(content as GeoContent);
	}
	return '';
}
