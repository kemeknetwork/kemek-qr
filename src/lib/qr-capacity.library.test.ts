import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import QRCodeStyling from 'qr-code-styling';
import { capacityVersionFor, qrModeOf, type EccLevel } from './qr-capacity';

/* The encoder is the ground truth: at every sampled boundary, the
 * version the library draws must be the one capacityVersionFor
 * predicts, with the library choosing the mode itself — so this also
 * fails if qrModeOf stops agreeing with the library's own pick (after
 * an upgrade, say). Versions 9/10 and 26/27 are where the count field
 * widens. Drawing is stubbed: only the encoder's version is read. */
type Encoded = { _qr: { getModuleCount(): number } };

function drawnVersion(data: string, ecc: EccLevel): number {
	const qr = new QRCodeStyling({ type: 'svg', data, qrOptions: { errorCorrectionLevel: ecc } });
	return ((qr as unknown as Encoded)._qr.getModuleCount() - 17) / 4;
}

/* Longest run of `make` that capacityVersionFor fits in `version`. */
function maxLength(make: (n: number) => string, ecc: EccLevel, version: number): number {
	let lo = 0;
	let hi = 8000;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		const v = capacityVersionFor(make(mid), ecc);
		if (v !== null && v <= version) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

const MODES = [
	['digits', (n: number) => '7'.repeat(n)],
	['upper-case', (n: number) => 'K'.repeat(n)],
	['lower-case', (n: number) => 'k'.repeat(n)]
] as const;

describe('capacityVersionFor against qr-code-styling', () => {
	beforeAll(() => {
		vi.spyOn(
			QRCodeStyling.prototype as unknown as { _setupSvg: () => void },
			'_setupSvg'
		).mockImplementation(() => {});
	});
	afterAll(() => vi.restoreAllMocks());

	it('the three sample payloads land in the three modes', () => {
		expect(MODES.map(([, make]) => qrModeOf(make(5)))).toEqual(['Numeric', 'Alphanumeric', 'Byte']);
	});

	for (const [name, make] of MODES) {
		for (const ecc of ['L', 'M', 'Q', 'H'] as const) {
			it(`${name} at ${ecc}: drawn version matches at each boundary`, () => {
				for (const version of [1, 2, 9, 10, 26, 27, 39, 40]) {
					const n = maxLength(make, ecc, version);
					expect(drawnVersion(make(n), ecc), `${n} chars`).toBe(version);
					if (version < 40) {
						expect(drawnVersion(make(n + 1), ecc), `${n + 1} chars`).toBe(version + 1);
					} else {
						expect(() => drawnVersion(make(n + 1), ecc)).toThrow();
					}
				}
			});
		}
	}
});
