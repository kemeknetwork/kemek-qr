import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'text',
	sub: 'Encode any string — a note, a poem, an offline message — into a QR code. Plain text, no scheme, no destination. Decoded by the scanner directly.',
	metaTitle: `Free Text QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'Generate QR codes for plain text. Free, no signup. Useful for notes, codes, instructions, anything that does not need to open in a browser.',
	paragraphs: [
		'A text QR code does not point anywhere. The scanner shows the decoded string and stops there. That is useful when the goal is to deliver information directly — a serial number, a poem, a one-time access code, a printed message — rather than open a website.',
		'Most modern phone cameras will offer to copy the decoded text. Some will offer to "search" it, which usually means a generic web search. There is no auto-redirect because there is nowhere to redirect to.',
		'QR codes can hold a few thousand characters at the highest density, but the practical limit is closer to 500 if you want it to scan reliably from a printed surface. Long blocks of text shrink the modules to the point where camera autofocus struggles.'
	],
	faq: [
		{
			q: 'Why use a text QR instead of a URL?',
			a: 'Three reasons: it works fully offline (the URL form does not need to be alive), it stays private (no link to track), and the recipient does not have to trust a domain.'
		},
		{
			q: 'How much can I fit?',
			a: 'Up to ~4,000 alphanumeric characters in theory. In practice keep it under 500 for paper, under 1,000 for screens — beyond that the modules get hard for cameras to resolve.'
		},
		{
			q: 'Can I include line breaks?',
			a: 'Yes. The encoder preserves them. Whether the scanner displays them is up to the scanner; most do.'
		}
	]
};

export default copy;
