/* Landing-page copy. Each plate's prose lives in `copy/<type>.ts` and
 * is imported only by that plate's route, so a page ships its own copy
 * and not the other seven. The titles below stay together because every
 * plate index lists all eight. Copy is meant to be useful (not SEO
 * filler) and to answer the obvious questions for the type. */

import type { ContentType } from './types';

export const BRAND = 'KeMeK';

export type LandingCopy = {
	type: ContentType;
	sub: string;
	/* Pattern: 'Free [type] QR Code Generator — No Signup | KeMeK'.
	 * Must stay under 60 chars for Google SERP rendering. */
	metaTitle: string;
	metaDesc: string;
	paragraphs: string[];
	faq: { q: string; a: string }[];
};

export type PlateTitle = {
	h1: string;
	/* Tighter mixed-case label used in cross-page plate indexes
	 * (e.g. About → plate index) where the full h1 would over-repeat
	 * "Free … QR code generator" eight times in a list. */
	plateLabel: string;
};

export const PLATE_TITLES: Record<ContentType, PlateTitle> = {
	url: { h1: 'Free URL QR code generator', plateLabel: 'URL QR code generator' },
	text: { h1: 'Free text QR code generator', plateLabel: 'Text QR code generator' },
	wifi: { h1: 'Free WiFi QR code generator', plateLabel: 'WiFi QR code generator' },
	vcard: { h1: 'Free vCard QR code generator', plateLabel: 'vCard QR code generator' },
	email: { h1: 'Free email QR code generator', plateLabel: 'Email QR code generator' },
	sms: { h1: 'Free SMS QR code generator', plateLabel: 'SMS QR code generator' },
	phone: { h1: 'Free phone QR code generator', plateLabel: 'Phone QR code generator' },
	geo: { h1: 'Free geo location QR code generator', plateLabel: 'Geo location QR code generator' }
};
