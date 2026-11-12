import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'url',
	sub: 'Encode any link to a QR code that scans, prints, and travels with you. Logo, color, and styling included — no account, no upload.',
	metaTitle: `Free URL QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'Generate QR codes for any URL. Free, no signup, no tracking. Customize colors, dot styles, and logo. Download PNG, SVG, or PDF straight from your browser.',
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
};

export default copy;
