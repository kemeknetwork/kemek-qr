/* Per-content-type landing-page copy. The build site is fully static
 * and prerendered, so this is the only place these strings live —
 * each route imports the entry it needs. Copy is meant to be useful
 * (not SEO filler) and to answer the obvious questions for the type. */

import type { ContentType } from './types';

export type LandingCopy = {
	h1: string;
	sub: string;
	/* Pattern: 'Free [type] QR Code Generator — No Signup, Privacy-First | KeMeK'. */
	metaTitle: string;
	metaDesc: string;
	/* Tighter mixed-case label used in cross-page plate indexes
	 * (e.g. About → plate index) where the full h1 would over-repeat
	 * "Free … QR code generator" eight times in a list. */
	plateLabel: string;
	paragraphs: string[];
	faq: { q: string; a: string }[];
};

const BRAND = 'KeMeK';

export const LANDING_COPY: Record<ContentType, LandingCopy> = {
	url: {
		h1: 'Free URL QR code generator',
		sub: 'Encode any link to a QR code that scans, prints, and travels with you. Logo, color, and styling included — no account, no upload.',
		metaTitle: `Free URL QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'Generate QR codes for any URL. Free, no signup, no tracking. Customize colors, dot styles, and logo. Download PNG, SVG, or PDF straight from your browser.',
		plateLabel: 'URL QR code generator',
		paragraphs: [
			'Paste a link, get a scannable QR code. The encoder runs entirely in your browser, so the URL you type never reaches our servers — there is no server to reach. The same is true for any logo you embed: it is read with FileReader and composited locally.',
			'A QR code that points at a URL is a static QR. It will work for as long as the destination URL itself works. There is no shortener in the middle, no analytics pixel, no expiring redirect. If you change your domain later, the old code stops resolving — that is the trade-off for not needing an account.',
			'For best print results, choose error correction H if the QR will live somewhere it might be partially obscured (a sticker on a bottle, a sign behind glass) and download the SVG or PDF for crisp scaling at any size.'
		],
		faq: [
			{
				q: 'Will this code expire?',
				a: 'No. Static QR codes do not expire. They encode the URL directly. As long as the URL works, the code works.'
			},
			{
				q: 'Can I edit the destination later?',
				a: 'Not in this tool. Editable destinations require a server-side redirect (a "dynamic QR"), which means accounts, hosting, and tracking. That is a different product. If you need that, regenerate the QR with the new URL.'
			},
			{
				q: 'Does the logo affect scannability?',
				a: 'Yes, slightly. We auto-bump error correction to H when a logo is embedded so the code stays robust. Keep the logo under 25% of the QR area for best results across scanners.'
			}
		]
	},

	text: {
		h1: 'Free text QR code generator',
		sub: 'Encode any string — a note, a poem, an offline message — into a QR code. Plain text, no scheme, no destination. Decoded by the scanner directly.',
		metaTitle: `Free Text QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'Generate QR codes for plain text. Free, no signup. Useful for notes, codes, instructions, anything that does not need to open in a browser.',
		plateLabel: 'Text QR code generator',
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
	},

	wifi: {
		h1: 'Free WiFi QR code generator',
		sub: 'Encode an SSID, password, and security type into a QR code so guests can join your network with a single scan. Generated locally — credentials never leave your browser.',
		metaTitle: `Free WiFi QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'Make a WiFi QR code that joins your network with one scan. Supports WPA/WPA2/WPA3, WEP, open. No signup, no tracking. Credentials stay in your browser.',
		plateLabel: 'WiFi QR code generator',
		paragraphs: [
			'A WiFi QR code carries the SSID, password, security type, and a hidden-network flag in a standard format that iOS and Android camera apps both recognize. When scanned, the phone offers to join the network — no typing required. This is the same format printed on the side of many home routers.',
			'The format is plain text — anyone who scans the QR can read the password by feeding the decoded string to a parser. That is fine for a guest WiFi sticker by your front door, less fine for a corporate network. Treat the printed QR like the printed password.',
			'For most networks, leave the security type at WPA — it covers WPA, WPA2, and WPA3. Choose WEP only if you have a legacy router. Choose None for an open network with no password. Hidden networks need the box checked so the phone knows to probe for the SSID actively.'
		],
		faq: [
			{
				q: 'Does this work on iPhones?',
				a: 'Yes — iOS 11 and later recognize the standard WiFi QR format and offer a "Join Network" tap. Android has supported it natively since Android 10 and via Google Lens for longer.'
			},
			{
				q: 'Is my password sent anywhere?',
				a: 'No. The encoder runs entirely in this browser. The string and the resulting image stay local until you choose to download or share them.'
			},
			{
				q: 'What about WPA-Enterprise (802.1X)?',
				a: 'Not supported by the standard WiFi QR format — those networks need certificates and per-user credentials that do not fit into a static QR. This tool is for home / guest / café networks.'
			}
		]
	},

	vcard: {
		h1: 'Free vCard QR code generator',
		sub: 'Pack contact details — name, organization, phone, email, address — into a QR code that adds you straight to someone’s phonebook. vCard 3.0, broadly supported.',
		metaTitle: `Free vCard QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'Make a vCard QR for your contact info. Scans into iPhone and Android contacts. Free, no signup, no tracking. Generated entirely in your browser.',
		plateLabel: 'vCard QR code generator',
		paragraphs: [
			'A vCard QR carries a contact card in the same format your phone uses to share a contact via AirDrop or Nearby Share. When scanned, the recipient is offered an "Add to Contacts" sheet pre-filled with the fields you set. It is the modern equivalent of a paper business card, except it survives the wallet.',
			'We emit vCard 3.0 because it has the widest scanner support across iPhone, Android, and the long tail of QR-reading apps. Newer versions (4.0) are slightly more compact but break in older readers. The trade-off is not worth it for a contact card.',
			'Only fill the fields you want shared. Everything you leave blank is omitted from the output entirely. If you put a logo on the QR, the scanner still gets the contact data — the logo is decorative, the data is in the surrounding modules.'
		],
		faq: [
			{
				q: 'Why vCard 3.0 instead of 4.0?',
				a: 'Compatibility. 3.0 reads cleanly on every camera app and QR scanner we have tested. 4.0 has marginal benefits and breaks in older readers.'
			},
			{
				q: 'Can I include a photo?',
				a: 'Not in this tool. Embedding a photo balloons the QR size to the point of unscannability. The logo overlay you can add is purely visual — it does not encode a photo into the contact card.'
			},
			{
				q: 'How do I update the card later?',
				a: 'Regenerate the QR. Static QRs cannot be edited after the fact. If you want a single QR pointing at always-current contact info, use a URL QR pointing at a vCard hosted on your own site.'
			}
		]
	},

	email: {
		h1: 'Free email QR code generator',
		sub: 'Encode a mailto: link with optional subject and body. Scanning opens a pre-filled draft in the recipient’s mail app — no need to copy your address.',
		metaTitle: `Free Email QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'Generate a QR code that opens an email draft when scanned. Pre-fill subject and body. Free, no signup, no tracking. Encoded in your browser.',
		plateLabel: 'Email QR code generator',
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
	},

	sms: {
		h1: 'Free SMS QR code generator',
		sub: 'Encode a phone number and an optional message body. Scanning opens a pre-filled SMS draft — useful for opt-in promotions, support shortcuts, and check-ins.',
		metaTitle: `Free SMS QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'QR codes that open a pre-filled SMS draft when scanned. Free, no signup, no tracking. Generated entirely in your browser.',
		plateLabel: 'SMS QR code generator',
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
	},

	phone: {
		h1: 'Free phone QR code generator',
		sub: 'Encode a phone number into a QR. Scanning offers a one-tap dial. tel: format, supported by every camera that scans QR codes.',
		metaTitle: `Free Phone QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'Generate QR codes that dial a phone number when scanned. Free, no signup, no tracking. Encoded in your browser.',
		plateLabel: 'Phone QR code generator',
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
	},

	geo: {
		h1: 'Free geo location QR code generator',
		sub: 'Encode latitude and longitude into a QR. Scanning opens the recipient’s default maps app, optionally with a labeled pin.',
		metaTitle: `Free Geo Location QR Code Generator — No Signup, Privacy-First | ${BRAND}`,
		metaDesc:
			'QR codes that open a map pin when scanned. Latitude / longitude with optional label. Free, no signup, no tracking. Generated entirely in your browser.',
		plateLabel: 'Geo location QR code generator',
		paragraphs: [
			'A geo QR uses the geo: URL scheme defined by RFC 5870. Scanning opens whatever maps app is the user’s default — Apple Maps on iOS, Google Maps or Waze on Android, Organic Maps if they have set that as default. The pin lands at the lat/lon you specify.',
			'The optional label is encoded as a `q=` parameter, a Google-Maps convention that most modern map apps honor. Older or stricter readers ignore the label and just drop a pin at the coordinates — that fallback is fine.',
			'Use for venue signage, trail markers, event meeting points, real-estate listings. For anything that needs an actual address (rather than a precise coordinate), a URL QR pointing at the place’s map listing is usually more reliable across apps.'
		],
		faq: [
			{
				q: 'How precise does the lat/lon need to be?',
				a: 'Five decimal places (about 1 meter) is enough for any pin-on-a-map use. Six decimals gets to ~10 cm and is overkill for a QR code.'
			},
			{
				q: 'Why does it open a different app on my phone vs. someone else’s?',
				a: 'The geo: scheme routes to whatever the user has set as default for maps. Different defaults, different apps. The pin location is the same.'
			}
		]
	}
};
