/* Contrast math for QR-scannability guidance. WCAG relative luminance
 * + ratio formula (the same math the a11y world uses for text), wrapped
 * with a QR-specific worst-case picker for gradients and a band
 * classifier the UI displays as an informational readout — not a gate.
 *
 * Brand stance: we show you the number, you decide. See `contrastBand`
 * thresholds for the warn/inverted bands.
 */

export type ContrastBand = 'ok' | 'low' | 'inverted';

/* Parse a hex string (#RGB or #RRGGBB) to [r, g, b] in 0..255. Returns
 * null if unparseable; caller should treat null as "skip the check"
 * (typically the picker hasn't committed a valid color yet). */
export function parseHex(hex: string): [number, number, number] | null {
	if (typeof hex !== 'string') return null;
	let h = hex.trim();
	if (h.startsWith('#')) h = h.slice(1);
	if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	if (h.length !== 6) return null;
	if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
	const n = parseInt(h, 16);
	return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/* sRGB → linear light, per WCAG 2.x. Input/output in 0..1. */
function srgbToLinear(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/* WCAG relative luminance — weighted sum after sRGB linearization.
 * Returns 0..1. */
export function relativeLuminance(hex: string): number | null {
	const rgb = parseHex(hex);
	if (!rgb) return null;
	const [r, g, b] = rgb.map(srgbToLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* WCAG contrast ratio between two colors. 1.0 = same; 21.0 = max
 * (black vs white). Returns null if either color is unparseable. */
export function contrastRatio(a: string, b: string): number | null {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	if (la === null || lb === null) return null;
	const lighter = Math.max(la, lb);
	const darker = Math.min(la, lb);
	return (lighter + 0.05) / (darker + 0.05);
}

/* Foreground luminance > background luminance — scanners overwhelmingly
 * expect dark-on-light, so "inverted" is a distinct failure mode from
 * "low contrast" (you can have high contrast that's still inverted). */
export function isInverted(fg: string, bg: string): boolean {
	const lf = relativeLuminance(fg);
	const lb = relativeLuminance(bg);
	if (lf === null || lb === null) return false;
	return lf > lb;
}

/* For gradients, return the gradient stop whose luminance sits closest
 * to the background — that's the worst-case scan-contrast point. A
 * gradient running black→pale-pink on white reads as ~12:1 against the
 * black stop but only ~1.4:1 against the pink stop; honest contrast is
 * the smaller of the two. */
export function effectiveFg(
	fgColor: string,
	gradientEnabled: boolean,
	gradientFrom: string,
	gradientTo: string,
	bgColor: string
): string {
	if (!gradientEnabled) return fgColor;
	const lFrom = relativeLuminance(gradientFrom);
	const lTo = relativeLuminance(gradientTo);
	const lBg = relativeLuminance(bgColor);
	if (lFrom === null || lTo === null || lBg === null) return fgColor;
	return Math.abs(lFrom - lBg) < Math.abs(lTo - lBg) ? gradientFrom : gradientTo;
}

/* Band classifier for the UI readout. Inversion overrides low — a
 * 15:1 inverted code still fails most scanners. <3:1 is the practical
 * floor for scan reliability across real-world cameras and lighting;
 * 4.5:1+ is comfortably safe. */
export function contrastBand(ratio: number | null, inverted: boolean): ContrastBand {
	if (inverted) return 'inverted';
	if (ratio === null) return 'ok';
	if (ratio < 3) return 'low';
	return 'ok';
}
