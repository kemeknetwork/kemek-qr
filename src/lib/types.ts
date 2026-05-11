/* Content-type shapes for kemek-qr. Each type has a state record that
 * the form binds to and that the matching encoder turns into a QR
 * payload string. Keep these shapes flat — they round-trip through the
 * permalink hash and any nesting wastes characters. */

export type ContentType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'sms' | 'phone' | 'geo';

export const CONTENT_TYPES: readonly ContentType[] = [
	'url',
	'text',
	'wifi',
	'vcard',
	'email',
	'sms',
	'phone',
	'geo'
] as const;

export type WifiAuth = 'WPA' | 'WEP' | 'nopass';

export type UrlContent = { url: string };
export type TextContent = { text: string };
export type WifiContent = { ssid: string; password: string; auth: WifiAuth; hidden: boolean };
export type VCardContent = {
	firstName: string;
	lastName: string;
	org: string;
	title: string;
	phone: string;
	email: string;
	url: string;
	address: string;
};
export type EmailContent = { to: string; subject: string; body: string };
export type SmsContent = { number: string; body: string };
export type PhoneContent = { number: string };
export type GeoContent = { lat: string; lon: string; query: string };

export type ContentMap = {
	url: UrlContent;
	text: TextContent;
	wifi: WifiContent;
	vcard: VCardContent;
	email: EmailContent;
	sms: SmsContent;
	phone: PhoneContent;
	geo: GeoContent;
};

export const DEFAULT_CONTENT: ContentMap = {
	url: { url: 'https://kemek.com' },
	text: { text: '' },
	wifi: { ssid: '', password: '', auth: 'WPA', hidden: false },
	vcard: {
		firstName: '',
		lastName: '',
		org: '',
		title: '',
		phone: '',
		email: '',
		url: '',
		address: ''
	},
	email: { to: '', subject: '', body: '' },
	sms: { number: '', body: '' },
	phone: { number: '' },
	geo: { lat: '', lon: '', query: '' }
};

export const TYPE_LABELS: Record<ContentType, string> = {
	url: 'URL',
	text: 'TEXT',
	wifi: 'WIFI',
	vcard: 'VCARD',
	email: 'EMAIL',
	sms: 'SMS',
	phone: 'PHONE',
	geo: 'GEO'
};

/* Route paths per content type. URL is the canonical landing at `/`;
 * all others sit at `/<type>`. Single source of truth for the
 * masthead nav, plate-index links, and any future cross-type
 * navigation. */
export const ROUTE_FOR_TYPE: Record<ContentType, string> = {
	url: '/',
	text: '/text',
	wifi: '/wifi',
	vcard: '/vcard',
	email: '/email',
	sms: '/sms',
	phone: '/phone',
	geo: '/geo'
};

/* Plate numbers — drawing-set ordering, two-digit zero-padded. URL
 * is plate 01 (canonical landing); the rest follow in spec.section
 * order so the sequence reads like a published volume. */
export const PLATE: Record<ContentType, string> = {
	url: '01',
	text: '02',
	wifi: '03',
	vcard: '04',
	email: '05',
	sms: '06',
	phone: '07',
	geo: '08'
};
