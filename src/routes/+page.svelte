<script lang="ts">
	import { onMount } from 'svelte';
	import type QRCodeStyling from 'qr-code-styling';
	import { decodePermalink, encodePermalink, type DotType, type ECC } from '$lib/permalink';

	let url = $state('https://kemek.com');
	let fgColor = $state('#1A1815');
	let bgColor = $state('#F2EBDD');
	let fgInput = $state('#1A1815');
	let bgInput = $state('#F2EBDD');
	let dotType = $state<DotType>('rounded');
	let errorCorrection = $state<ECC>('auto');
	let logoDataUrl = $state<string | null>(null);
	let logoName = $state<string | null>(null);
	let logoSize = $state(0.25);
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

	const eccOptions: ECC[] = ['auto', 'L', 'M', 'Q', 'H'];

	let qrContainer: HTMLDivElement;
	let qrInstance: InstanceType<typeof QRCodeStyling> | null = null;
	let QRCodeStylingClass: typeof QRCodeStyling | null = null;

	function buildOpts() {
		const ecc: 'L' | 'M' | 'Q' | 'H' =
			errorCorrection === 'auto' ? (logoDataUrl ? 'H' : 'M') : errorCorrection;
		return {
			width: 480,
			height: 480,
			type: 'svg' as const,
			// qr-code-styling throws on empty `data`; fall back to the brand URL
			// so an empty input renders a valid placeholder QR rather than crashing.
			data: url.trim() || 'https://kemek.com',
			image: logoDataUrl ?? undefined,
			margin: 6,
			qrOptions: { errorCorrectionLevel: ecc },
			dotsOptions: { color: fgColor, type: dotType },
			backgroundOptions: { color: bgColor },
			cornersSquareOptions: { color: fgColor, type: 'square' as const },
			cornersDotOptions: { color: fgColor, type: 'square' as const },
			imageOptions: {
				crossOrigin: 'anonymous' as const,
				margin: 4,
				imageSize: logoSize,
				hideBackgroundDots: true
			}
		};
	}

	onMount(async () => {
		if (typeof window !== 'undefined' && window.location.hash) {
			const decoded = decodePermalink(window.location.hash);
			if (decoded) {
				if (decoded.url !== undefined) url = decoded.url;
				if (decoded.fg !== undefined) fgColor = decoded.fg;
				if (decoded.bg !== undefined) bgColor = decoded.bg;
				if (decoded.dot !== undefined) dotType = decoded.dot;
				if (decoded.ecc !== undefined) errorCorrection = decoded.ecc;
				if (decoded.logoSize !== undefined) logoSize = decoded.logoSize;
				if (decoded.logoDataUrl !== undefined) {
					logoDataUrl = decoded.logoDataUrl;
					logoName = 'shared logo';
				}
			}
		}

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

	$effect(() => {
		if (!qrInstance) return;
		qrInstance.update(buildOpts());
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
				url,
				fg: fgColor,
				bg: bgColor,
				dot: dotType,
				ecc: errorCorrection,
				logoSize,
				logoDataUrl
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

	async function downloadPNG() {
		if (!QRCodeStylingClass) return;
		try {
			const exporter = new QRCodeStylingClass({
				...buildOpts(),
				width: 1024,
				height: 1024,
				type: 'canvas'
			});
			await exporter.download({ name: 'kemek-qr', extension: 'png' });
		} catch (err) {
			engineError = err instanceof Error ? `Download failed: ${err.message}` : 'Download failed.';
		}
	}

	let resolvedECC = $derived(
		errorCorrection === 'auto' ? (logoDataUrl ? 'H' : 'M') : errorCorrection
	);
	let dotLabel = $derived(dotOptions.find((d) => d.value === dotType)?.label ?? '—');

	/* Soft, non-blocking URL warning. We never gate encoding — QR codes
	 * happily encode any text, and users sometimes intentionally encode
	 * mailto:, intent://, or arbitrary strings. We only nudge when the
	 * input looks URL-ish (contains a dot, no spaces) but won't parse,
	 * since that's the high-confidence "you probably meant a URL" case. */
	let urlWarning = $derived.by(() => {
		const v = url.trim();
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

<section class="hero">
	<span class="eyebrow">FIG. 01 — KEMEK / QR · URL ENCODE</span>
	<h1 class="hero-title">
		A QR code that <em>doesn't&nbsp;want</em> anything from you.
	</h1>
	<p class="hero-sub">
		Free. No signup. No tracking. Logo and styling included.<br />
		Generated in your browser — your data never leaves your machine.
	</p>
</section>

<hr class="rule" />

<section class="workshop">
	<div class="specimen">
		<div class="specimen-frame">
			<span class="crop crop-tl" aria-hidden="true"></span>
			<span class="crop crop-tr" aria-hidden="true"></span>
			<span class="crop crop-bl" aria-hidden="true"></span>
			<span class="crop crop-br" aria-hidden="true"></span>
			<div class="specimen-stage">
				<div bind:this={qrContainer} class="qr-mount" role="img" aria-label="QR code preview"></div>
				{#if engineError}
					<div class="engine-error" role="alert">
						<span class="engine-error-eyebrow">PROTOCOL ERROR</span>
						<p>{engineError}</p>
					</div>
				{/if}
			</div>
		</div>

		<dl class="specimen-meta">
			<div>
				<dt>FORMAT</dt>
				<dd>PNG · 1024<span class="x">×</span>1024</dd>
			</div>
			<div>
				<dt>DOTS</dt>
				<dd>{dotLabel}</dd>
			</div>
			<div>
				<dt>EC</dt>
				<dd>{resolvedECC}{errorCorrection === 'auto' ? ' · auto' : ''}</dd>
			</div>
			<div>
				<dt>LOGO</dt>
				<dd>{logoName ?? 'none'}</dd>
			</div>
		</dl>

		<div class="action-row">
			<button class="download" type="button" onclick={downloadPNG}>
				<span class="download-label">DOWNLOAD PNG</span>
				<span class="download-size">1024 PX</span>
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
		<fieldset class="control-block">
			<legend>DESTINATION</legend>
			<label class="field">
				<span class="field-label">URL</span>
				<input
					type="url"
					bind:value={url}
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

		<fieldset class="control-block">
			<legend>COLOR</legend>
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
			<legend>DOT STYLE</legend>
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
			<legend>LOGO</legend>
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
			<legend>ERROR CORRECTION</legend>
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
	</div>
</section>

<style>
	.hero {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 5.5rem) var(--gutter) clamp(2rem, 4vw, 3rem);
		max-width: min(var(--max-w), 60ch);
		animation: fade-up var(--duration-slow) var(--ease) both;
	}
	.hero-title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: var(--fs-display);
		line-height: 1.02;
		letter-spacing: -0.025em;
		margin: 0.85rem 0 1.6rem;
		color: var(--ink);
		font-variation-settings: 'opsz' 144;
	}
	.hero-title em {
		font-style: italic;
		color: var(--accent);
		font-variation-settings: 'opsz' 144;
	}
	.hero-sub {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		color: var(--ghost);
		margin: 0;
		max-width: 56ch;
		line-height: 1.65;
		letter-spacing: 0.01em;
	}

	.rule {
		border: none;
		border-top: 1px solid var(--rule);
		margin: 0 auto;
		max-width: var(--max-w);
	}

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
		gap: 1.4rem;
		animation: fade-up var(--duration-slow) var(--ease) 120ms both;
	}

	.specimen-frame {
		position: relative;
		aspect-ratio: 1;
		background: var(--paper-warm);
		border: 1px solid var(--rule);
		padding: clamp(2rem, 5vw, 3.25rem);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.4),
			0 24px 60px -32px rgba(26, 24, 21, 0.25);
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

	.specimen-meta {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		margin: 0;
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--paper);
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
		font-size: 9px;
		letter-spacing: 0.2em;
		color: var(--micro);
		margin: 0;
	}
	.specimen-meta dd {
		margin: 0;
		font-size: var(--fs-xs);
		color: var(--ink);
		letter-spacing: 0.04em;
		word-break: break-all;
	}
	.specimen-meta .x {
		color: var(--accent);
		margin: 0 0.1em;
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

	.action-row {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: 0.6rem;
	}
	@media (max-width: 520px) {
		.action-row {
			grid-template-columns: 1fr;
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
		color: var(--ghost);
		padding: 0.18rem 0.55rem;
		margin-left: -0.25rem;
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: 99px;
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
	.segmented.cols-5 {
		grid-template-columns: repeat(5, 1fr);
	}
	.seg {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.65rem 0.4rem;
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
		border: 1px dashed var(--rule-strong);
		border-radius: var(--radius-sm);
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--ghost);
		background: var(--paper);
		transition: all var(--duration-fast);
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
