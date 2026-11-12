import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'geo',
	sub: 'Encode latitude and longitude into a QR. Scanning opens the recipient’s default maps app, optionally with a labeled pin.',
	metaTitle: `Free Geo QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'QR codes that open a map pin when scanned. Latitude / longitude with optional label. Free, no signup, no tracking. Generated entirely in your browser.',
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
};

export default copy;
