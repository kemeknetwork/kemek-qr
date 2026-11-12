import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'email',
	sub: 'Encode a mailto: link with optional subject and body. Scanning opens a pre-filled draft in the recipient’s mail app — no need to copy your address.',
	metaTitle: `Free Email QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'Generate a QR code that opens an email draft when scanned. Pre-fill subject and body. Free, no signup, no tracking. Encoded in your browser.',
	paragraphs: [
		'An email QR encodes a mailto: URL — the same format you would use in an HTML link. When scanned, the phone opens the user’s default mail app with the To, Subject, and Body fields pre-filled. The user can edit before sending; nothing is sent automatically.',
		'Subject and body are URL-encoded so spaces, ampersands, and line breaks survive the round-trip. There is no length limit imposed by the QR format itself — the practical limit is whatever the scanner’s URL parser tolerates, which is comfortably in the thousands of characters.',
		'Use cases: a help-desk poster ("Scan to email support with the right subject line"), a print-ad reply mechanism, an event RSVP. For long-form messages, prefer encoding a URL pointing at a proper form — QR codes are not great for typing.'
	],
	faq: [
		{
			q: 'Does the scanner send the email automatically?',
			a: 'No. Scanning opens a draft. The recipient must hit Send themselves. This is a deliberate safety property of the mailto: format.'
		},
		{
			q: 'What if the user has no default mail app?',
			a: 'Most phones handle mailto: by routing to whichever mail app the user has installed. If none is installed, the system shows a generic "No app to handle this" message. Add a mail app or pick a different QR type.'
		}
	]
};

export default copy;
