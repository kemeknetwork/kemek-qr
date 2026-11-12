import { BRAND, type LandingCopy } from '../landing-copy';

const copy: LandingCopy = {
	type: 'vcard',
	sub: 'Pack contact details — name, organization, phone, email, address — into a QR code that adds you straight to someone’s phonebook. vCard 3.0, broadly supported.',
	metaTitle: `Free vCard QR Code Generator — No Signup | ${BRAND}`,
	metaDesc:
		'Make a vCard QR for your contact info. Scans into iPhone and Android contacts. Free, no signup, no tracking. Generated entirely in your browser.',
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
};

export default copy;
