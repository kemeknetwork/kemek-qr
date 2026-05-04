<script lang="ts">
	import { onMount } from 'svelte';
	import type QRCodeStyling from 'qr-code-styling';
	import {
		decodePermalink,
		encodePermalink,
		type DotType,
		type ECC,
		type EyeBallType,
		type EyeFrameType
	} from '$lib/permalink';
	import { encode } from '$lib/encoders';
	import { DEFAULT_CONTENT, type ContentMap, type ContentType, type WifiAuth } from '$lib/types';

	/* The content type is fixed by the route (prop). Cross-type
	 * navigation is anchor-link nav in the layout, not in-page tabs. */
	let { type = 'url' as ContentType }: { type?: ContentType } = $props();
	const contentType = $derived(type);
	let content = $state<ContentMap>(structuredClone(DEFAULT_CONTENT));
	let fgColor = $state('#1A1815');
	let bgColor = $state('#F2EBDD');
	let fgInput = $state('#1A1815');
	let bgInput = $state('#F2EBDD');
	let dotType = $state<DotType>('rounded');
	let errorCorrection = $state<ECC>('auto');
	let logoDataUrl = $state<string | null>(null);
	let logoName = $state<string | null>(null);
	let logoSize = $state(0.25);
	let gradientEnabled = $state(false);
	let gradientFrom = $state('#1A1815');
	let gradientTo = $state('#C53A1F');
	let gradientAngle = $state(45);
	let eyeFrame = $state<EyeFrameType>('square');
	let eyeBall = $state<EyeBallType>('square');
	let frameEnabled = $state(false);
	let frameLabel = $state('SCAN ME');
	let exportFormat = $state<'png' | 'svg' | 'pdf'>('png');
	let exporting = $state(false);
	let engineError = $state<string | null>(null);
	let logoError = $state<string | null>(null);
	let copyState = $state<'idle' | 'copied' | 'dropped'>('idle');
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	const dotOptions: { value: DotType; label: string }[] = [
		{ value: 'square', label: 'SQUARE' },
		{ value: 'rounded', label: 'ROUNDED' },
		{ value: 'dots', label: 'DOTS' },
		{ value: 'classy', label: 'CLASSY' },
		{ value: 'classy-rounded', label: 'CLASSY+' },
		{ value: 'extra-rounded', label: 'EXTRA' }
	];

	const eyeFrameOptions: { value: EyeFrameType; label: string }[] = [
		{ value: 'square', label: 'SQUARE' },
		{ value: 'rounded', label: 'ROUNDED' },
		{ value: 'extra-rounded', label: 'EXTRA' },
		{ value: 'dot', label: 'DOT' }
	];

	const eyeBallOptions: { value: EyeBallType; label: string }[] = [
		{ value: 'square', label: 'SQUARE' },
		{ value: 'rounded', label: 'ROUNDED' },
		{ value: 'dot', label: 'DOT' }
	];

	const eccOptions: ECC[] = ['auto', 'L', 'M', 'Q', 'H'];

	let qrContainer: HTMLDivElement;
	let qrInstance: InstanceType<typeof QRCodeStyling> | null = null;
	let QRCodeStylingClass: typeof QRCodeStyling | null = null;

	/* qr-code-styling expresses linear gradients as a rotation in radians
	 * around the center; we expose degrees in the UI for ergonomics. */
	function buildGradient() {
		if (!gradientEnabled) return undefined;
		return {
			type: 'linear' as const,
			rotation: (gradientAngle * Math.PI) / 180,
			colorStops: [
				{ offset: 0, color: gradientFrom },
				{ offset: 1, color: gradientTo }
			]
		};
	}

	function buildOpts() {
		const ecc: 'L' | 'M' | 'Q' | 'H' =
			errorCorrection === 'auto' ? (logoDataUrl ? 'H' : 'M') : errorCorrection;
		const encoded = encode(contentType, content[contentType]);
		const gradient = buildGradient();
		return {
			width: 480,
			height: 480,
			type: 'svg' as const,
			// qr-code-styling throws on empty `data`; fall back to the brand URL
			// so an empty input renders a valid placeholder QR rather than crashing.
			data: encoded.trim() || 'https://kemek.com',
			image: logoDataUrl ?? undefined,
			margin: 6,
			qrOptions: { errorCorrectionLevel: ecc },
			dotsOptions: { color: fgColor, type: dotType, gradient },
			backgroundOptions: { color: bgColor },
			cornersSquareOptions: { color: fgColor, type: eyeFrame, gradient },
			cornersDotOptions: { color: fgColor, type: eyeBall, gradient },
			imageOptions: {
				crossOrigin: 'anonymous' as const,
				margin: 4,
				imageSize: logoSize,
				hideBackgroundDots: true
			}
		};
	}

	const sessionKey = $derived(`kemek-qr:session:${type}`);

	function applyDecoded(decoded: ReturnType<typeof decodePermalink>) {
		if (!decoded) return;
		/* The route fixes contentType, so we only restore the content
		 * payload when the source's type matches this route's type.
		 * Mismatches keep the styling but ignore the content (which
		 * is shaped for the wrong form). */
		if (decoded.type === type && decoded.content) {
			(content as Record<ContentType, unknown>)[type] = {
				...(content[type] as Record<string, unknown>),
				...(decoded.content as Record<string, unknown>)
			};
		}
		if (decoded.fg !== undefined) fgColor = decoded.fg;
		if (decoded.bg !== undefined) bgColor = decoded.bg;
		if (decoded.dot !== undefined) dotType = decoded.dot;
		if (decoded.ecc !== undefined) errorCorrection = decoded.ecc;
		if (decoded.logoSize !== undefined) logoSize = decoded.logoSize;
		if (decoded.logoDataUrl !== undefined) {
			logoDataUrl = decoded.logoDataUrl;
			logoName = 'saved logo';
		}
		if (decoded.eyeFrame !== undefined) eyeFrame = decoded.eyeFrame;
		if (decoded.eyeBall !== undefined) eyeBall = decoded.eyeBall;
		if (decoded.gradientEnabled !== undefined) gradientEnabled = decoded.gradientEnabled;
		if (decoded.gradientFrom !== undefined) gradientFrom = decoded.gradientFrom;
		if (decoded.gradientTo !== undefined) gradientTo = decoded.gradientTo;
		if (decoded.gradientAngle !== undefined) gradientAngle = decoded.gradientAngle;
		if (decoded.frameEnabled !== undefined) frameEnabled = decoded.frameEnabled;
		if (decoded.frameLabel !== undefined) frameLabel = decoded.frameLabel;
	}

	let restored = false;

	onMount(async () => {
		/* Hash takes priority over session storage so a shared link
		 * always overrides what's saved locally — the recipient sees
		 * the sender's QR, not their own last edits. */
		if (typeof window !== 'undefined') {
			if (window.location.hash) {
				applyDecoded(decodePermalink(window.location.hash));
			} else {
				try {
					const raw = localStorage.getItem(sessionKey);
					if (raw) applyDecoded(decodePermalink(`s=${raw}`));
				} catch {
					/* localStorage can throw in private mode or with
					 * quota exhaustion — silent fallback to defaults. */
				}
			}
		}
		restored = true;

		try {
			const m = await import('qr-code-styling');
			QRCodeStylingClass = m.default;
			qrInstance = new QRCodeStylingClass(buildOpts());
			qrInstance.append(qrContainer);
		} catch (err) {
			engineError =
				err instanceof Error ? `QR engine failed to load: ${err.message}` : 'QR engine failed to load.';
		}
	});

	/* Auto-save current state to localStorage 1s after the user stops
	 * editing, scoped to this route's content type. Reload restores
	 * the session unless the user landed via a hash permalink. */
	const SAVE_DEBOUNCE_MS = 1000;
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const snapshot = {
			type,
			content: content[type],
			fg: fgColor,
			bg: bgColor,
			dot: dotType,
			ecc: errorCorrection,
			logoSize,
			logoDataUrl,
			gradientEnabled,
			gradientFrom,
			gradientTo,
			gradientAngle,
			eyeFrame,
			eyeBall,
			frameEnabled,
			frameLabel
		};
		if (!restored || typeof window === 'undefined') return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			try {
				const result = encodePermalink(snapshot, '');
				localStorage.setItem(sessionKey, result.hash.replace(/^s=/, ''));
			} catch {
				/* QuotaExceededError most likely (large logo + many
				 * sibling-route sessions). The next field edit
				 * retries after the user has presumably trimmed
				 * something; no surfaced error. */
			}
		}, SAVE_DEBOUNCE_MS);
		return () => {
			if (saveTimer) clearTimeout(saveTimer);
		};
	});

	/* Debounce QR re-renders so a typing burst coalesces into one update.
	 * 80ms is long enough to swallow back-to-back keystrokes (~16 cps
	 * average) and short enough that the preview still feels live.
	 *
	 * IMPORTANT: buildOpts() must run BEFORE the qrInstance guard so
	 * Svelte tracks every reactive read on the effect's first
	 * invocation. Bailing out before reading state would leave the
	 * effect with zero dependencies, and subsequent state changes
	 * would never re-trigger it — manifesting as a dead preview while
	 * downloads (which read buildOpts() at click time) still work. */
	const RENDER_DEBOUNCE_MS = 80;
	let renderTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const opts = buildOpts();
		if (!qrInstance) return;
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			qrInstance?.update(opts);
		}, RENDER_DEBOUNCE_MS);
		return () => {
			if (renderTimer) clearTimeout(renderTimer);
		};
	});

	function handleLogoUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		logoError = null;
		const reader = new FileReader();
		reader.onload = () => {
			logoDataUrl = reader.result as string;
			logoName = file.name;
		};
		reader.onerror = reader.onabort = () => {
			logoError = `Couldn't read ${file.name}.`;
			input.value = '';
		};
		reader.readAsDataURL(file);
	}

	function clearLogo() {
		logoDataUrl = null;
		logoName = null;
		logoError = null;
	}

	async function copyPermalink() {
		if (typeof window === 'undefined') return;
		const result = encodePermalink(
			{
				type: contentType,
				content: content[contentType],
				fg: fgColor,
				bg: bgColor,
				dot: dotType,
				ecc: errorCorrection,
				logoSize,
				logoDataUrl,
				gradientEnabled,
				gradientFrom,
				gradientTo,
				gradientAngle,
				eyeFrame,
				eyeBall,
				frameEnabled,
				frameLabel
			},
			window.location.href
		);
		try {
			await navigator.clipboard.writeText(result.url);
			copyState = result.logoDropped ? 'dropped' : 'copied';
		} catch {
			window.history.replaceState(null, '', `#${result.hash}`);
			copyState = result.logoDropped ? 'dropped' : 'copied';
		}
		if (copyTimer) clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copyState = 'idle'), 2400);
	}

	/* Compose the QR PNG inside an outer frame with a label band. We
	 * draw onto a canvas larger than the QR, fill with bg, draw the
	 * QR centered, stroke a border, then render the label centered
	 * below in the foreground color. Returns a Blob; caller triggers
	 * the download. */
	async function composeFramedPng(qrBlob: Blob, qrSize: number, label: string): Promise<Blob> {
		const img = await blobToImage(qrBlob);
		const padding = Math.round(qrSize * 0.05);
		const borderWidth = Math.max(2, Math.round(qrSize * 0.008));
		const labelHeight = Math.round(qrSize * 0.14);
		const totalW = qrSize + padding * 2;
		const totalH = qrSize + padding * 2 + labelHeight;

		const canvas = document.createElement('canvas');
		canvas.width = totalW;
		canvas.height = totalH;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('canvas 2d context unavailable');

		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, totalW, totalH);

		ctx.drawImage(img, padding, padding, qrSize, qrSize);

		ctx.strokeStyle = fgColor;
		ctx.lineWidth = borderWidth;
		const half = borderWidth / 2;
		ctx.strokeRect(half, half, totalW - borderWidth, totalH - borderWidth);

		ctx.fillStyle = fgColor;
		const fontPx = Math.round(labelHeight * 0.42);
		ctx.font = `500 ${fontPx}px "JetBrains Mono", ui-monospace, monospace`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const labelY = qrSize + padding * 2 + labelHeight / 2;
		ctx.fillText(label, totalW / 2, labelY);

		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) resolve(blob);
				else reject(new Error('canvas.toBlob returned null'));
			}, 'image/png');
		});
	}

	function blobToImage(blob: Blob): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(blob);
			const img = new Image();
			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve(img);
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('image decode failed'));
			};
			img.src = url;
		});
	}

	function triggerDownload(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	async function downloadPNG() {
		if (!QRCodeStylingClass) return;
		const exportSize = 1024;
		const exporter = new QRCodeStylingClass({
			...buildOpts(),
			width: exportSize,
			height: exportSize,
			type: 'canvas'
		});
		if (frameEnabled) {
			const blob = (await exporter.getRawData('png')) as Blob | null;
			if (!blob) throw new Error('QR rasterization returned null');
			const framed = await composeFramedPng(blob, exportSize, frameLabel);
			triggerDownload(framed, 'kemek-qr.png');
		} else {
			await exporter.download({ name: 'kemek-qr', extension: 'png' });
		}
	}

	/* Wrap the qr-code-styling SVG output in an outer SVG that adds a
	 * border rect and label text below. Uses DOMParser to inject the
	 * original SVG as a nested element — browsers and most SVG viewers
	 * render nested <svg> correctly. */
	function composeFramedSvg(qrSvgText: string, qrSize: number, label: string): string {
		const padding = Math.round(qrSize * 0.05);
		const borderWidth = Math.max(2, Math.round(qrSize * 0.008));
		const labelHeight = Math.round(qrSize * 0.14);
		const totalW = qrSize + padding * 2;
		const totalH = qrSize + padding * 2 + labelHeight;
		const fontPx = Math.round(labelHeight * 0.42);
		const half = borderWidth / 2;

		const parser = new DOMParser();
		const doc = parser.parseFromString(qrSvgText, 'image/svg+xml');
		const inner = doc.documentElement;
		inner.setAttribute('x', String(padding));
		inner.setAttribute('y', String(padding));
		inner.setAttribute('width', String(qrSize));
		inner.setAttribute('height', String(qrSize));
		const innerSerialized = new XMLSerializer().serializeToString(inner);

		const escapeXml = (s: string) =>
			s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
  <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${bgColor}"/>
  <rect x="${half}" y="${half}" width="${totalW - borderWidth}" height="${totalH - borderWidth}" fill="none" stroke="${fgColor}" stroke-width="${borderWidth}"/>
  ${innerSerialized}
  <text x="${totalW / 2}" y="${qrSize + padding * 2 + labelHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-weight="500" font-size="${fontPx}" fill="${fgColor}" letter-spacing="3">${escapeXml(label)}</text>
</svg>`;
	}

	async function downloadSVG() {
		if (!QRCodeStylingClass) return;
		const exportSize = 1024;
		const exporter = new QRCodeStylingClass({
			...buildOpts(),
			width: exportSize,
			height: exportSize,
			type: 'svg'
		});
		const blob = (await exporter.getRawData('svg')) as Blob | null;
		if (!blob) throw new Error('SVG rasterization returned null');
		const text = await blob.text();
		const finalText = frameEnabled ? composeFramedSvg(text, exportSize, frameLabel) : text;
		const finalBlob = new Blob([finalText], { type: 'image/svg+xml' });
		triggerDownload(finalBlob, 'kemek-qr.svg');
	}

	/* PDF embeds the QR as a high-res PNG (2048px) onto a centered A4
	 * page. True-vector embedding would require an SVG-to-PDF path
	 * converter we don't carry; 2048px raster is print-quality at any
	 * realistic size (>300 DPI for a 6-inch QR). The frame, if enabled,
	 * is drawn natively via pdf-lib instead of being rasterized — the
	 * label text is true PDF text, searchable and crisp. */
	async function downloadPDF() {
		if (!QRCodeStylingClass) return;
		const exportSize = 2048;
		const exporter = new QRCodeStylingClass({
			...buildOpts(),
			width: exportSize,
			height: exportSize,
			type: 'canvas'
		});
		const blob = (await exporter.getRawData('png')) as Blob | null;
		if (!blob) throw new Error('QR rasterization returned null');
		const arrayBuffer = await blob.arrayBuffer();

		const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
		const pdf = await PDFDocument.create();
		// A4 portrait in points (1pt = 1/72 inch).
		const pageW = 595;
		const pageH = 842;
		const page = pdf.addPage([pageW, pageH]);
		const qrEmbed = await pdf.embedPng(arrayBuffer);

		const fg = hexToRgb01(fgColor);
		const bg = hexToRgb01(bgColor);

		if (frameEnabled) {
			const qrPt = 360;
			const padding = qrPt * 0.05;
			const borderWidth = Math.max(1.5, qrPt * 0.008);
			const labelBand = qrPt * 0.14;
			const totalW = qrPt + padding * 2;
			const totalH = qrPt + padding * 2 + labelBand;
			const x0 = (pageW - totalW) / 2;
			const y0 = (pageH - totalH) / 2;

			page.drawRectangle({
				x: x0,
				y: y0,
				width: totalW,
				height: totalH,
				color: rgb(bg.r, bg.g, bg.b)
			});
			page.drawRectangle({
				x: x0,
				y: y0,
				width: totalW,
				height: totalH,
				borderColor: rgb(fg.r, fg.g, fg.b),
				borderWidth
			});
			page.drawImage(qrEmbed, {
				x: x0 + padding,
				y: y0 + padding + labelBand,
				width: qrPt,
				height: qrPt
			});

			const font = await pdf.embedFont(StandardFonts.Courier);
			const fontSize = labelBand * 0.42;
			const labelWidth = font.widthOfTextAtSize(frameLabel, fontSize);
			page.drawText(frameLabel, {
				x: x0 + (totalW - labelWidth) / 2,
				y: y0 + (labelBand - fontSize) / 2 + fontSize * 0.2,
				size: fontSize,
				font,
				color: rgb(fg.r, fg.g, fg.b)
			});
		} else {
			const qrPt = 400;
			page.drawImage(qrEmbed, {
				x: (pageW - qrPt) / 2,
				y: (pageH - qrPt) / 2,
				width: qrPt,
				height: qrPt
			});
		}

		const pdfBytes = await pdf.save();
		// pdf-lib gives Uint8Array; copy into a tight ArrayBuffer for Blob
		// compatibility across browsers (some refuse SharedArrayBuffer-typed
		// views in Blob constructors).
		const buffer = pdfBytes.slice().buffer;
		triggerDownload(new Blob([buffer], { type: 'application/pdf' }), 'kemek-qr.pdf');
	}

	function hexToRgb01(hex: string): { r: number; g: number; b: number } {
		const m = hex.match(/^#([0-9A-Fa-f]{6})$/);
		if (!m) return { r: 0, g: 0, b: 0 };
		const n = parseInt(m[1], 16);
		return {
			r: ((n >> 16) & 0xff) / 255,
			g: ((n >> 8) & 0xff) / 255,
			b: (n & 0xff) / 255
		};
	}

	async function downloadActive() {
		if (exporting) return;
		exporting = true;
		try {
			if (exportFormat === 'png') await downloadPNG();
			else if (exportFormat === 'svg') await downloadSVG();
			else await downloadPDF();
		} catch (err) {
			engineError = err instanceof Error ? `Download failed: ${err.message}` : 'Download failed.';
		} finally {
			exporting = false;
		}
	}

	let resolvedECC = $derived(
		errorCorrection === 'auto' ? (logoDataUrl ? 'H' : 'M') : errorCorrection
	);
	let dotLabel = $derived(dotOptions.find((d) => d.value === dotType)?.label ?? '—');

	/* Soft, non-blocking URL warning. Only fires on the URL type; other
	 * types have their own shape and shouldn't be told they "don't look
	 * like a URL" — that's by design. We never gate encoding either way:
	 * QR codes happily encode any text. */
	let urlWarning = $derived.by(() => {
		if (contentType !== 'url') return null;
		const v = content.url.url.trim();
		if (!v) return null;
		const looksUrlish = v.includes('.') && !/\s/.test(v);
		if (!looksUrlish) return null;
		try {
			new URL(v.includes('://') ? v : `https://${v}`);
			return null;
		} catch {
			return 'non-URL input — scanners may not auto-open this';
		}
	});

	const HEX_RE = /^#[0-9A-F]{6}$/;

	/* Sanitize → trim, strip junk, prepend #, uppercase, expand 3-digit
	 * shorthand. Reverts to `fallback` if input can't be coerced into a
	 * valid 6-digit hex. Called on blur of the text input only — typing
	 * remains free-form so partial input isn't fought by the validator. */
	function sanitizeHex(input: string, fallback: string): string {
		let v = input.trim().toUpperCase();
		if (v.startsWith('#')) v = v.slice(1);
		v = v.replace(/[^0-9A-F]/g, '');
		if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
		const candidate = `#${v}`;
		return HEX_RE.test(candidate) ? candidate : fallback;
	}

	function commitFgHex() {
		const next = sanitizeHex(fgInput, fgColor);
		fgColor = next;
		fgInput = next;
	}
	function commitBgHex() {
		const next = sanitizeHex(bgInput, bgColor);
		bgColor = next;
		bgInput = next;
	}

	/* Color picker writes directly to fgColor/bgColor; mirror into the
	 * text input so the two views stay in sync without binding the same
	 * variable twice (which would let typed-in-progress text fight the
	 * picker's lowercased output). */
	$effect(() => {
		fgInput = fgColor;
	});
	$effect(() => {
		bgInput = bgColor;
	});
</script>

<section class="workshop">
	<div class="specimen">
		<div class="dim dim-top" aria-hidden="true">
			<span class="tick tick-l"></span>
			<span class="dim-line dim-line-l"></span>
			<span class="dim-readout">{exportFormat === 'pdf' ? '2048' : exportFormat === 'svg' ? '∞' : '1024'} PX · {exportFormat.toUpperCase()}</span>
			<span class="dim-line dim-line-r"></span>
			<span class="tick tick-r"></span>
		</div>
		<div class="specimen-frame">
			<span class="crop crop-tl" aria-hidden="true"></span>
			<span class="crop crop-tr" aria-hidden="true"></span>
			<span class="crop crop-bl" aria-hidden="true"></span>
			<span class="crop crop-br" aria-hidden="true"></span>
			<div class="specimen-stage">
				<div
					class="qr-frame"
					class:qr-frame-on={frameEnabled}
					style:--frame-fg={fgColor}
					style:--frame-bg={bgColor}
				>
					<div bind:this={qrContainer} class="qr-mount" role="img" aria-label="QR code preview"></div>
					{#if frameEnabled}
						<div class="qr-frame-label">{frameLabel}</div>
					{/if}
				</div>
				{#if engineError}
					<div class="engine-error" role="alert">
						<span class="engine-error-eyebrow">PROTOCOL ERROR</span>
						<p>{engineError}</p>
					</div>
				{/if}
			</div>
		</div>

		<dl class="specimen-meta" aria-label="Specimen specification schedule">
			<div>
				<dt>S-01 FORMAT</dt>
				<dd>{exportFormat.toUpperCase()}{exportFormat === 'png' ? ' · 1024 PX' : exportFormat === 'pdf' ? ' · A4 / 2048' : ' · VECTOR'}</dd>
			</div>
			<div>
				<dt>S-02 DOTS</dt>
				<dd>{dotLabel}</dd>
			</div>
			<div>
				<dt>S-03 EC</dt>
				<dd>{resolvedECC}{errorCorrection === 'auto' ? ' · auto' : ''}</dd>
			</div>
			<div>
				<dt>S-04 LOGO</dt>
				<dd>{logoName ?? '— none'}</dd>
			</div>
		</dl>

		<div class="export-formats" role="radiogroup" aria-label="Export format">
			{#each ['png', 'svg', 'pdf'] as const as fmt}
				<label class="format-tab" class:active={exportFormat === fmt}>
					<input type="radio" name="export-format" value={fmt} bind:group={exportFormat} />
					{fmt.toUpperCase()}
				</label>
			{/each}
		</div>
		<div class="action-row">
			<button
				class="download"
				type="button"
				onclick={downloadActive}
				disabled={exporting}
				aria-busy={exporting}
			>
				<span class="download-label">
					{exporting ? 'PREPARING…' : `DOWNLOAD ${exportFormat.toUpperCase()}`}
				</span>
				<span class="download-size">
					{#if exportFormat === 'png'}1024 PX
					{:else if exportFormat === 'svg'}VECTOR
					{:else}A4 / 2048 PX{/if}
				</span>
				<span class="download-arrow" aria-hidden="true">↓</span>
			</button>
			<button
				class="permalink"
				type="button"
				onclick={copyPermalink}
				aria-live="polite"
			>
				<span class="permalink-label">
					{#if copyState === 'copied'}LINK COPIED
					{:else if copyState === 'dropped'}COPIED — LOGO NOT IN LINK
					{:else}COPY LINK{/if}
				</span>
				<span class="permalink-glyph" aria-hidden="true">⌁</span>
			</button>
		</div>
		{#if copyState === 'dropped'}
			<p class="permalink-note">
				Logo is too large to include in the link — recipient will see the QR
				without it. Re-attaching the logo on their end recreates the design.
			</p>
		{/if}
	</div>

	<div class="controls">
		{#if contentType === 'url'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> DESTINATION</legend>
				<label class="field">
					<span class="field-label">URL</span>
					<input
						type="url"
						bind:value={content.url.url}
						placeholder="https://"
						spellcheck="false"
						autocomplete="off"
						aria-describedby={urlWarning ? 'url-warning' : undefined}
					/>
				</label>
				{#if urlWarning}
					<p id="url-warning" class="field-warning">{urlWarning}</p>
				{/if}
			</fieldset>
		{:else if contentType === 'text'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> TEXT</legend>
				<label class="field">
					<span class="field-label">CONTENT</span>
					<textarea
						class="textarea"
						bind:value={content.text.text}
						placeholder="Anything — a note, a poem, an offline message"
						rows="4"
						spellcheck="false"
					></textarea>
				</label>
			</fieldset>
		{:else if contentType === 'wifi'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> WIFI NETWORK</legend>
				<label class="field">
					<span class="field-label">SSID</span>
					<input
						type="text"
						bind:value={content.wifi.ssid}
						placeholder="Network name"
						spellcheck="false"
						autocomplete="off"
					/>
				</label>
				<label class="field">
					<span class="field-label">PASSWORD</span>
					<input
						type="text"
						bind:value={content.wifi.password}
						placeholder={content.wifi.auth === 'nopass' ? 'not used' : ''}
						disabled={content.wifi.auth === 'nopass'}
						spellcheck="false"
						autocomplete="off"
					/>
				</label>
				<div class="field-row" style="padding-top: 0.85rem;">
					<label class="color-field">
						<span class="field-label">SECURITY</span>
						<select
							class="select"
							bind:value={content.wifi.auth as WifiAuth}
						>
							<option value="WPA">WPA / WPA2 / WPA3</option>
							<option value="WEP">WEP</option>
							<option value="nopass">None (open)</option>
						</select>
					</label>
					<label class="checkbox-field">
						<input type="checkbox" bind:checked={content.wifi.hidden} />
						<span class="field-label">HIDDEN NETWORK</span>
					</label>
				</div>
			</fieldset>
		{:else if contentType === 'vcard'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> CONTACT</legend>
				<div class="field-row" style="padding-top: 0.45rem;">
					<label class="color-field">
						<span class="field-label">FIRST NAME</span>
						<input type="text" bind:value={content.vcard.firstName} autocomplete="given-name" />
					</label>
					<label class="color-field">
						<span class="field-label">LAST NAME</span>
						<input type="text" bind:value={content.vcard.lastName} autocomplete="family-name" />
					</label>
				</div>
				<div class="field-row" style="padding-top: 0.85rem;">
					<label class="color-field">
						<span class="field-label">ORG</span>
						<input type="text" bind:value={content.vcard.org} autocomplete="organization" />
					</label>
					<label class="color-field">
						<span class="field-label">TITLE</span>
						<input type="text" bind:value={content.vcard.title} autocomplete="organization-title" />
					</label>
				</div>
				<label class="field" style="padding-top: 0.85rem;">
					<span class="field-label">PHONE</span>
					<input type="tel" bind:value={content.vcard.phone} autocomplete="tel" />
				</label>
				<label class="field">
					<span class="field-label">EMAIL</span>
					<input type="email" bind:value={content.vcard.email} autocomplete="email" />
				</label>
				<label class="field">
					<span class="field-label">URL</span>
					<input type="url" bind:value={content.vcard.url} autocomplete="url" />
				</label>
				<label class="field">
					<span class="field-label">ADDRESS</span>
					<input type="text" bind:value={content.vcard.address} autocomplete="street-address" />
				</label>
			</fieldset>
		{:else if contentType === 'email'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> EMAIL</legend>
				<label class="field">
					<span class="field-label">TO</span>
					<input type="email" bind:value={content.email.to} autocomplete="email" />
				</label>
				<label class="field">
					<span class="field-label">SUBJECT</span>
					<input type="text" bind:value={content.email.subject} />
				</label>
				<label class="field">
					<span class="field-label">BODY</span>
					<textarea class="textarea" bind:value={content.email.body} rows="3"></textarea>
				</label>
			</fieldset>
		{:else if contentType === 'sms'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> SMS</legend>
				<label class="field">
					<span class="field-label">NUMBER</span>
					<input type="tel" bind:value={content.sms.number} placeholder="+1 555 123 4567" />
				</label>
				<label class="field">
					<span class="field-label">MESSAGE</span>
					<textarea class="textarea" bind:value={content.sms.body} rows="3"></textarea>
				</label>
			</fieldset>
		{:else if contentType === 'phone'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> PHONE</legend>
				<label class="field">
					<span class="field-label">NUMBER</span>
					<input
						type="tel"
						bind:value={content.phone.number}
						placeholder="+1 555 123 4567"
						autocomplete="tel"
					/>
				</label>
			</fieldset>
		{:else if contentType === 'geo'}
			<fieldset class="control-block">
				<legend><span class="p-num">P-01</span> GEO</legend>
				<div class="field-row" style="padding-top: 0.45rem;">
					<label class="color-field">
						<span class="field-label">LATITUDE</span>
						<input type="text" bind:value={content.geo.lat} placeholder="40.7128" />
					</label>
					<label class="color-field">
						<span class="field-label">LONGITUDE</span>
						<input type="text" bind:value={content.geo.lon} placeholder="-74.0060" />
					</label>
				</div>
				<label class="field" style="padding-top: 0.85rem;">
					<span class="field-label">LABEL (OPTIONAL)</span>
					<input type="text" bind:value={content.geo.query} placeholder="Statue of Liberty" />
				</label>
			</fieldset>
		{/if}

		<fieldset class="control-block">
			<legend><span class="p-num">P-02</span> COLOR</legend>
			<div class="field-row">
				<label class="color-field">
					<span class="field-label">FOREGROUND</span>
					<span class="color-input">
						<input type="color" bind:value={fgColor} aria-label="Foreground color" />
						<input
							type="text"
							bind:value={fgInput}
							onblur={commitFgHex}
							class="hex"
							maxlength="7"
							spellcheck="false"
							aria-label="Foreground hex"
						/>
					</span>
				</label>
				<label class="color-field">
					<span class="field-label">BACKGROUND</span>
					<span class="color-input">
						<input type="color" bind:value={bgColor} aria-label="Background color" />
						<input
							type="text"
							bind:value={bgInput}
							onblur={commitBgHex}
							class="hex"
							maxlength="7"
							spellcheck="false"
							aria-label="Background hex"
						/>
					</span>
				</label>
			</div>
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-03</span> GRADIENT</legend>
			<label class="checkbox-field" style="padding-top: 0.55rem;">
				<input type="checkbox" bind:checked={gradientEnabled} />
				<span class="field-label">ENABLE LINEAR GRADIENT</span>
			</label>
			{#if gradientEnabled}
				<div class="field-row">
					<label class="color-field">
						<span class="field-label">FROM</span>
						<span class="color-input">
							<input type="color" bind:value={gradientFrom} aria-label="Gradient start" />
							<input
								type="text"
								bind:value={gradientFrom}
								class="hex"
								maxlength="7"
								spellcheck="false"
								aria-label="Gradient start hex"
							/>
						</span>
					</label>
					<label class="color-field">
						<span class="field-label">TO</span>
						<span class="color-input">
							<input type="color" bind:value={gradientTo} aria-label="Gradient end" />
							<input
								type="text"
								bind:value={gradientTo}
								class="hex"
								maxlength="7"
								spellcheck="false"
								aria-label="Gradient end hex"
							/>
						</span>
					</label>
				</div>
				<label class="slider-field">
					<span class="field-label">ANGLE <em>{gradientAngle}°</em></span>
					<input type="range" min="0" max="360" step="1" bind:value={gradientAngle} />
				</label>
			{/if}
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-04</span> DOT STYLE</legend>
			<div class="segmented cols-3">
				{#each dotOptions as opt}
					<label class="seg" class:active={dotType === opt.value}>
						<input
							type="radio"
							name="dot-type"
							value={opt.value}
							bind:group={dotType}
						/>
						{opt.label}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-05</span> EYE FRAME</legend>
			<div class="segmented cols-4">
				{#each eyeFrameOptions as opt}
					<label class="seg" class:active={eyeFrame === opt.value}>
						<input
							type="radio"
							name="eye-frame"
							value={opt.value}
							bind:group={eyeFrame}
						/>
						{opt.label}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-06</span> EYE BALL</legend>
			<div class="segmented cols-3">
				{#each eyeBallOptions as opt}
					<label class="seg" class:active={eyeBall === opt.value}>
						<input
							type="radio"
							name="eye-ball"
							value={opt.value}
							bind:group={eyeBall}
						/>
						{opt.label}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-07</span> LOGO</legend>
			<div class="logo-row">
				<label class="logo-upload">
					<input
						type="file"
						accept="image/png,image/svg+xml,image/jpeg"
						onchange={handleLogoUpload}
					/>
					<span>{logoDataUrl ? 'REPLACE FILE' : 'UPLOAD FILE'}</span>
				</label>
				{#if logoDataUrl}
					<button type="button" class="logo-clear" onclick={clearLogo}>CLEAR</button>
				{/if}
			</div>
			{#if logoError}
				<p class="logo-error" role="alert">{logoError}</p>
			{/if}
			<label class="slider-field">
				<span class="field-label">SIZE <em>{(logoSize * 100).toFixed(0)}%</em></span>
				<input
					type="range"
					min="0.1"
					max="0.35"
					step="0.01"
					bind:value={logoSize}
					disabled={!logoDataUrl}
				/>
			</label>
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-08</span> ERROR CORRECTION</legend>
			<div class="segmented cols-5">
				{#each eccOptions as ecc}
					<label class="seg" class:active={errorCorrection === ecc}>
						<input
							type="radio"
							name="ecc"
							value={ecc}
							bind:group={errorCorrection}
						/>
						{ecc.toUpperCase()}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset class="control-block">
			<legend><span class="p-num">P-09</span> OUTER FRAME</legend>
			<label class="checkbox-field" style="padding-top: 0.55rem;">
				<input type="checkbox" bind:checked={frameEnabled} />
				<span class="field-label">ADD FRAME &amp; LABEL</span>
			</label>
			{#if frameEnabled}
				<label class="field" style="padding-top: 0.85rem;">
					<span class="field-label">LABEL</span>
					<input
						type="text"
						bind:value={frameLabel}
						maxlength="64"
						placeholder="SCAN ME"
						spellcheck="false"
					/>
				</label>
			{/if}
		</fieldset>
	</div>
</section>

<style>
	.workshop {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2.5rem, 5vw, 4rem) var(--gutter) clamp(3rem, 6vw, 5rem);
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
		gap: clamp(2rem, 5vw, 4.5rem);
		align-items: start;
	}
	@media (max-width: 880px) {
		.workshop {
			grid-template-columns: 1fr;
		}
	}

	.specimen {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: fade-up var(--duration-slow) var(--ease) 120ms both;
	}

	/* Dimension line above the specimen: a thin horizontal rule with
	 * end-cap ticks and a centered scale-readout. The whole assembly
	 * reads like the dimension callouts on an engineering drawing. */
	.dim {
		display: grid;
		grid-template-columns: auto 1fr auto 1fr auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.4rem;
		font-family: var(--font-mono);
	}
	.tick {
		display: block;
		width: 1px;
		height: 9px;
		background: var(--accent);
	}
	.dim-line {
		display: block;
		height: 1px;
		background: var(--rule-strong);
		position: relative;
	}
	/* Diamond stops sit at the outer end of each segment, just inside
	 * the tick. Inner ends (next to the readout) butt directly into the
	 * readout's paper background, so no marker is needed there. */
	.dim-line-l::before,
	.dim-line-r::after {
		content: '';
		position: absolute;
		width: 5px;
		height: 5px;
		border: 1px solid var(--accent);
		background: var(--paper);
		top: 50%;
		transform: translateY(-50%) rotate(45deg);
	}
	.dim-line-l::before {
		left: 0;
	}
	.dim-line-r::after {
		right: 0;
	}
	.dim-readout {
		font-size: 9.5px;
		letter-spacing: 0.22em;
		color: var(--accent);
		text-transform: uppercase;
		font-feature-settings: 'tnum';
		padding: 0 0.45rem;
		background: var(--paper);
		white-space: nowrap;
	}

	.specimen-frame {
		position: relative;
		aspect-ratio: 1;
		background: var(--paper-warm);
		border: 1px solid var(--rule);
		padding: clamp(1.4rem, 5vw, 3.25rem);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.4),
			0 24px 60px -32px rgba(26, 24, 21, 0.25);
	}
	@media (max-width: 540px) {
		.specimen-frame {
			padding: clamp(1.1rem, 4.5vw, 1.6rem);
		}
		.crop {
			width: 14px;
			height: 14px;
		}
		.crop-tl,
		.crop-tr,
		.crop-bl,
		.crop-br {
			--crop-inset: 9px;
		}
		.crop-tl { top: var(--crop-inset); left: var(--crop-inset); }
		.crop-tr { top: var(--crop-inset); right: var(--crop-inset); }
		.crop-bl { bottom: var(--crop-inset); left: var(--crop-inset); }
		.crop-br { bottom: var(--crop-inset); right: var(--crop-inset); }
	}

	.crop {
		position: absolute;
		width: 18px;
		height: 18px;
		color: var(--accent);
	}
	.crop::before,
	.crop::after {
		content: '';
		position: absolute;
		background: currentColor;
	}
	.crop::before {
		width: 100%;
		height: 1px;
	}
	.crop::after {
		width: 1px;
		height: 100%;
	}
	.crop-tl {
		top: 12px;
		left: 12px;
	}
	.crop-tl::before {
		top: 0;
		left: 0;
	}
	.crop-tl::after {
		top: 0;
		left: 0;
	}
	.crop-tr {
		top: 12px;
		right: 12px;
	}
	.crop-tr::before {
		top: 0;
		right: 0;
	}
	.crop-tr::after {
		top: 0;
		right: 0;
	}
	.crop-bl {
		bottom: 12px;
		left: 12px;
	}
	.crop-bl::before {
		bottom: 0;
		left: 0;
	}
	.crop-bl::after {
		bottom: 0;
		left: 0;
	}
	.crop-br {
		bottom: 12px;
		right: 12px;
	}
	.crop-br::before {
		bottom: 0;
		right: 0;
	}
	.crop-br::after {
		bottom: 0;
		right: 0;
	}

	.specimen-stage {
		position: relative;
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
	}
	.qr-mount {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
	}
	.qr-mount :global(svg),
	.qr-mount :global(canvas) {
		width: 100%;
		height: auto;
		max-width: 100%;
		display: block;
	}

	.qr-frame {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
	.qr-frame.qr-frame-on {
		background: var(--frame-bg);
		border: 2px solid var(--frame-fg);
		padding: 5%;
		gap: 0.6rem;
	}
	.qr-frame-label {
		text-align: center;
		font-family: var(--font-mono);
		font-weight: 500;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--frame-fg);
		font-size: clamp(11px, 2.4vw, 18px);
		padding: 0.3rem 0;
	}

	.specimen-meta {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		margin: 0;
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--paper);
	}
	@media (max-width: 640px) {
		.specimen-meta {
			grid-template-columns: repeat(2, 1fr);
		}
		.specimen-meta > div {
			border-bottom: 1px solid var(--rule);
		}
		.specimen-meta > div:nth-child(2n) {
			border-right: none;
		}
		.specimen-meta > div:nth-last-child(-n + 2) {
			border-bottom: none;
		}
	}
	.specimen-meta > div {
		padding: 0.65rem 0.8rem 0.7rem;
		border-right: 1px solid var(--rule);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.specimen-meta > div:last-child {
		border-right: none;
	}
	.specimen-meta dt {
		font-size: 8.5px;
		letter-spacing: 0.22em;
		color: var(--accent);
		margin: 0;
		font-feature-settings: 'tnum';
		font-weight: 500;
	}
	.specimen-meta dd {
		margin: 0;
		font-size: var(--fs-xs);
		color: var(--ink);
		letter-spacing: 0.04em;
		word-break: break-all;
	}
	.download {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem 1.4rem;
		background: var(--ink);
		color: var(--paper);
		border: 1px solid var(--ink);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-weight: 500;
		letter-spacing: 0.18em;
		font-size: var(--fs-sm);
		transition:
			transform var(--duration-fast) var(--ease),
			background var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease);
		box-shadow: 0 12px 24px -16px rgba(26, 24, 21, 0.5);
	}
	.download:hover {
		background: var(--accent);
		border-color: var(--accent);
	}
	.download:active {
		transform: translateY(1px);
	}
	.download-size {
		font-size: 10px;
		color: rgba(242, 235, 221, 0.55);
		margin-left: auto;
	}
	.download-arrow {
		font-size: var(--fs-md);
		line-height: 1;
		transition: transform var(--duration-base) var(--ease);
	}
	.download:hover .download-arrow {
		transform: translateY(2px);
	}

	.export-formats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--paper);
	}
	.format-tab {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.55rem 0.4rem;
		min-height: 36px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.2em;
		color: var(--ghost);
		border-right: 1px solid var(--rule);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
		text-transform: uppercase;
		user-select: none;
	}
	@media (max-width: 720px) {
		.format-tab {
			padding: 0.85rem 0.4rem;
			min-height: var(--touch);
		}
	}
	.format-tab:last-child {
		border-right: none;
	}
	.format-tab input[type='radio'] {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
		margin: -1px;
		padding: 0;
	}
	.format-tab:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: -3px;
	}
	.format-tab:hover {
		color: var(--ink);
		background: var(--paper-warm);
	}
	.format-tab.active {
		color: var(--paper);
		background: var(--ink);
	}

	.action-row {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: 0.6rem;
	}
	.download:disabled {
		opacity: 0.55;
		cursor: progress;
	}
	@media (max-width: 520px) {
		.action-row {
			grid-template-columns: 1fr;
		}
		.download {
			padding: 1rem 1rem;
			gap: 0.7rem;
			letter-spacing: 0.12em;
		}
		.permalink {
			padding: 1rem 0.85rem;
			letter-spacing: 0.1em;
		}
	}

	.permalink {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 1.1rem 1rem;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-weight: 500;
		letter-spacing: 0.16em;
		font-size: 10px;
		text-transform: uppercase;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease),
			background var(--duration-fast) var(--ease),
			transform var(--duration-fast) var(--ease);
	}
	.permalink:hover {
		color: var(--accent);
		border-color: var(--accent);
	}
	.permalink:active {
		transform: translateY(1px);
	}
	.permalink-label {
		text-align: left;
		line-height: 1.2;
	}
	.permalink-glyph {
		font-size: var(--fs-md);
		color: var(--accent);
	}
	.permalink-note {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--ghost);
		line-height: 1.5;
		margin: 0;
		padding: 0.7rem 0.85rem;
		background: var(--paper);
		border: 1px dashed var(--rule);
		border-radius: var(--radius-sm);
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		animation: fade-up var(--duration-slow) var(--ease) 240ms both;
	}

	.control-block {
		border: 1px solid var(--rule);
		background: var(--paper-warm);
		padding: 0.5rem 1rem 1rem;
		border-radius: var(--radius-sm);
		position: relative;
	}
	.control-block legend {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		color: var(--ink);
		padding: 0.22rem 0.6rem 0.22rem 0.45rem;
		margin-left: -0.25rem;
		background: var(--paper);
		border: 1px solid var(--rule-strong);
		border-radius: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-transform: uppercase;
		font-weight: 500;
	}
	.control-block legend .p-num {
		font-size: 9px;
		letter-spacing: 0.18em;
		color: var(--accent);
		font-feature-settings: 'tnum';
		padding-right: 0.5rem;
		border-right: 1px solid var(--rule);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding-top: 0.4rem;
	}
	.field-label {
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.field-label em {
		font-style: normal;
		color: var(--ink);
		font-weight: 500;
		margin-left: 0.4em;
	}

	.control-block input[type='url'],
	.control-block input[type='text']:not(.hex) {
		border-bottom: 1px solid var(--rule-strong);
		padding: 0.3rem 0;
		font-size: var(--fs-base);
		transition: border-color var(--duration-fast);
	}
	.control-block input[type='url']:focus,
	.control-block input[type='text']:focus {
		border-bottom-color: var(--accent);
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding-top: 0.45rem;
	}
	@media (max-width: 480px) {
		.field-row {
			grid-template-columns: 1fr;
			gap: 0.85rem;
		}
	}
	.color-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.color-input {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		background: var(--paper);
		padding: 0.3rem 0.5rem;
		min-height: 40px;
	}
	@media (max-width: 720px) {
		.color-input {
			min-height: var(--touch);
			padding: 0.4rem 0.55rem;
		}
		.color-input input[type='color'] {
			width: 32px;
			height: 32px;
		}
	}
	.color-input input[type='color'] {
		-webkit-appearance: none;
		appearance: none;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 0;
	}
	.color-input input[type='color']::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.color-input input[type='color']::-webkit-color-swatch {
		border: 1px solid var(--rule-strong);
		border-radius: 2px;
	}
	.hex {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		width: 8ch;
		background: transparent;
		border: none;
		outline: none;
		letter-spacing: 0.02em;
	}
	.color-input:focus-within {
		border-color: var(--accent);
	}

	.segmented {
		display: grid;
		gap: 0;
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		overflow: hidden;
		margin-top: 0.5rem;
		background: var(--paper);
	}
	.segmented.cols-3 {
		grid-template-columns: repeat(3, 1fr);
	}
	.segmented.cols-4 {
		grid-template-columns: repeat(4, 1fr);
	}
	.segmented.cols-5 {
		grid-template-columns: repeat(5, 1fr);
	}
	.seg {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.65rem 0.4rem;
		min-height: 36px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		color: var(--ghost);
		border: none;
		border-right: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		background: transparent;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
		text-transform: uppercase;
		user-select: none;
	}
	@media (max-width: 720px) {
		.seg {
			padding: 0.85rem 0.4rem;
			min-height: var(--touch);
		}
	}
	/* Visually hide the radio but keep it focusable so native arrow-key
	   navigation across the radiogroup works. The <label> is the click target. */
	.seg input[type='radio'] {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
		margin: -1px;
		padding: 0;
	}
	.seg:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: -3px;
	}
	.segmented.cols-3 .seg:nth-child(3n) {
		border-right: none;
	}
	.segmented.cols-3 .seg:nth-last-child(-n + 3) {
		border-bottom: none;
	}
	.segmented.cols-4 .seg {
		border-bottom: none;
	}
	.segmented.cols-4 .seg:nth-child(4n) {
		border-right: none;
	}
	.segmented.cols-5 .seg {
		border-bottom: none;
	}
	.segmented.cols-5 .seg:nth-child(5n) {
		border-right: none;
	}
	.seg:hover {
		color: var(--ink);
		background: var(--paper-warm);
	}
	.seg.active {
		color: var(--paper);
		background: var(--ink);
	}

	.logo-row {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.5rem;
	}
	.logo-upload {
		flex: 1;
		position: relative;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 0.75rem;
		min-height: 40px;
		border: 1px dashed var(--rule-strong);
		border-radius: var(--radius-sm);
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--ghost);
		background: var(--paper);
		transition: all var(--duration-fast);
	}
	@media (max-width: 720px) {
		.logo-upload {
			min-height: var(--touch);
			padding: 0.85rem 0.75rem;
		}
		.logo-clear {
			min-height: var(--touch);
		}
	}
	.logo-upload:hover {
		color: var(--accent);
		border-color: var(--accent);
	}
	.logo-upload input[type='file'] {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
	.logo-clear {
		padding: 0.7rem 0.9rem;
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--ghost);
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-fast);
	}
	.logo-clear:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	.slider-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.85rem;
	}
	.slider-field input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 2px;
		background: var(--rule-strong);
		cursor: pointer;
		outline: none;
	}
	.slider-field input[type='range']:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.slider-field input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		background: var(--ink);
		border-radius: 50%;
		cursor: pointer;
		transition:
			transform var(--duration-fast),
			background var(--duration-fast);
	}
	.slider-field input[type='range']::-moz-range-thumb {
		width: 14px;
		height: 14px;
		background: var(--ink);
		border: none;
		border-radius: 50%;
		cursor: pointer;
	}
	@media (max-width: 720px) {
		.slider-field input[type='range'] {
			height: 4px;
		}
		.slider-field input[type='range']::-webkit-slider-thumb {
			width: 22px;
			height: 22px;
		}
		.slider-field input[type='range']::-moz-range-thumb {
			width: 22px;
			height: 22px;
		}
	}
	.slider-field input[type='range']:hover::-webkit-slider-thumb {
		transform: scale(1.15);
		background: var(--accent);
	}

	/* ─── Error states ───────────────────────────────────── */
	.engine-error {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		gap: 0.4rem;
		padding: 1.5rem;
		text-align: center;
		background: rgba(242, 235, 221, 0.94);
		color: var(--accent-deep);
	}
	.engine-error-eyebrow {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		color: var(--accent);
	}
	.engine-error p {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		margin: 0;
		line-height: 1.5;
		max-width: 32ch;
	}
	.logo-error {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--accent);
		margin: 0.6rem 0 0;
	}
	.textarea {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		padding: 0.55rem 0.7rem;
		width: 100%;
		resize: vertical;
		outline: none;
		color: var(--ink);
		line-height: 1.45;
		transition: border-color var(--duration-fast);
	}
	.textarea:focus {
		border-color: var(--accent);
	}
	.select {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		padding: 0.4rem 0.55rem;
		color: var(--ink);
		outline: none;
		cursor: pointer;
		width: 100%;
		transition: border-color var(--duration-fast);
	}
	.select:focus {
		border-color: var(--accent);
	}
	.checkbox-field {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding-top: 1.55rem;
		font-family: var(--font-mono);
		cursor: pointer;
	}
	.checkbox-field input[type='checkbox'] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.field-warning {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ghost);
		margin: 0.55rem 0 0;
		padding-left: 0.7rem;
		border-left: 2px solid var(--accent);
		line-height: 1.5;
	}

	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
