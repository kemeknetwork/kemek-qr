/* qr-code-styling (via qrcode-generator) turns its `data` string into
 * bytes by keeping each UTF-16 code unit's low byte, so anything above
 * U+00FF is corrupted in the printed code: `✓` (U+2713) is stored as
 * 0x13, a curly apostrophe (U+2019) as 0x19, and an emoji as two junk
 * bytes. Handing the library the payload's UTF-8 bytes, one per char,
 * makes that truncation a no-op, so the code holds standard UTF-8 —
 * which scanners detect without an ECI header — and its byte count is
 * exactly the `TextEncoder` length the ECC / capacity logic sizes on. */
export function toQrByteString(text: string): string {
	let out = '';
	for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte);
	return out;
}
