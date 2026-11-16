/* qr-code-styling (via qrcode-generator) turns its `data` string into
 * bytes by keeping each UTF-16 code unit's low byte, so anything above
 * U+00FF is corrupted in the printed code: `✓` (U+2713) is stored as
 * 0x13, a curly apostrophe (U+2019) as 0x19, and an emoji as junk
 * bytes. Handing the library the payload's UTF-8 bytes, one per char,
 * makes that truncation a no-op, and the code's byte count is exactly
 * the `TextEncoder` length the ECC / capacity logic sizes on.
 *
 * Latin-1 text goes out as UTF-8 too, although the spec's default for
 * byte mode without an ECI header (which the library cannot write) is
 * ISO-8859-1. Mainstream decoders detect UTF-8 heuristically, and they
 * misread short Latin-1 runs: zxing decodes the Latin-1 bytes of `ÉÈ`
 * as the Shift_JIS katakana `ﾉﾈ`. */
export function toQrByteString(text: string): string {
	let out = '';
	for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte);
	return out;
}
