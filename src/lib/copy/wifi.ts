import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'wifi',
	sub: 'Encode an SSID, password, and security type into a QR code so guests can join your network with a single scan. Generated locally — credentials never leave your browser.',
	metaTitle: `Free WiFi QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'Make a WiFi QR code that joins your network with one scan. Supports WPA/WPA2/WPA3, WEP, open. No signup, no tracking. Credentials stay in your browser.',
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
};

export default copy;
