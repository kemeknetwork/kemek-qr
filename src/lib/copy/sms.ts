import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'sms',
	sub: 'Encode a phone number and an optional message body. Scanning opens a pre-filled SMS draft — useful for opt-in promotions, support shortcuts, and check-ins.',
	metaTitle: `Free SMS QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'QR codes that open a pre-filled SMS draft when scanned. Free, no signup, no tracking. Generated entirely in your browser.',
	paragraphs: [
		'An SMS QR encodes the recipient number and a message body. We use the SMSTO: format, which has the broadest stock-app compatibility — better than the official sms: scheme, which some Android stock messaging apps still mishandle.',
		'Common uses include "Text JOIN to opt in" replacements, support shortcuts ("Scan to text our help desk"), and event check-ins where a typed message is awkward. As with the email QR, scanning opens a draft — the user has to send.',
		'Include the country code in the number for international robustness. A bare 10-digit US number works on US carriers but breaks if scanned abroad.'
	],
	faq: [
		{
			q: 'Why SMSTO: instead of sms:?',
			a: 'Wider Android compatibility. The sms: scheme is the RFC standard but a meaningful slice of stock messaging apps mis-parse the body parameter. SMSTO: is the de-facto fallback that just works.'
		},
		{
			q: 'Can it send the SMS automatically?',
			a: 'No. The phone opens a draft; the user sends it. There is no way for a QR scan to silently send a text — that would be a security hole, and platforms do not allow it.'
		}
	]
};

export default copy;
