import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'phone',
	sub: 'Encode a phone number into a QR. Scanning offers a one-tap dial. tel: format, supported by every camera that scans QR codes.',
	metaTitle: `Free Phone QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'Generate QR codes that dial a phone number when scanned. Free, no signup, no tracking. Encoded in your browser.',
	paragraphs: [
		'A phone QR encodes a tel: URL — the same format used by clickable phone numbers in HTML. Scanning offers a "Call <number>" prompt. The user has to confirm; phones do not silently dial from a QR.',
		'Include the country code (+1 for the US, +44 for the UK, etc.) so the QR works regardless of where it is scanned. A national-format number works locally but fails when a traveler scans it.',
		'Use for service stickers ("Tap to call support"), business cards where dialing matters more than messaging, and accessibility cases where typing the number is awkward.'
	],
	faq: [
		{
			q: 'Does it support extensions?',
			a: 'Yes. Append `;ext=1234` to the number — the tel: format passes it through to the dialer, which most modern phones honor.'
		},
		{
			q: 'Why not just print the number?',
			a: 'A QR removes the typing step. It is also more usable in low-vision contexts and at distance — the camera can read it from across a counter.'
		}
	]
};

export default copy;
