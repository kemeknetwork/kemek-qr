<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		value: string;
		label: string;
	};

	let { value = $bindable(), label }: Props = $props();

	let open = $state(false);
	let panelEl = $state<HTMLDivElement | null>(null);
	let padEl = $state<HTMLDivElement | null>(null);
	let hueEl = $state<HTMLDivElement | null>(null);
	let originalColor = $state(value);
	let hasEyeDropper = $state(false);
	let history = $state<string[]>([]);

	let hue = $state(0);
	let sat = $state(0);
	let light = $state(0);

	const PALETTE = [
		{ hex: '#000000', short: 'BLK', name: 'Black' },
		{ hex: '#1A1815', short: 'INK', name: 'Ink' },
		{ hex: '#333333', short: 'CHR', name: 'Charcoal' },
		{ hex: '#C53A1F', short: 'ACC', name: 'Accent' },
		{ hex: '#16140F', short: 'PPD', name: 'Paper dark' },
		{ hex: '#F2EBDD', short: 'PPR', name: 'Paper' },
		{ hex: '#FFFFFF', short: 'WHT', name: 'White' }
	];

	const HISTORY_KEY = 'kemek-qr:color-history';
	const HISTORY_MAX = 6;

	onMount(() => {
		hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
		try {
			const raw = localStorage.getItem(HISTORY_KEY);
			if (raw) history = JSON.parse(raw);
		} catch {
			/* ignored — history is a luxury, not load-bearing */
		}
	});

	function hexToRgb(hex: string): [number, number, number] | null {
		const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
		if (!m) return null;
		const n = parseInt(m[1], 16);
		return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
	}
	function rgbToHex(r: number, g: number, b: number): string {
		const c = (v: number) =>
			Math.max(0, Math.min(255, Math.round(v)))
				.toString(16)
				.padStart(2, '0');
		return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
	}
	function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
		const rN = r / 255;
		const gN = g / 255;
		const bN = b / 255;
		const max = Math.max(rN, gN, bN);
		const min = Math.min(rN, gN, bN);
		const l = (max + min) / 2;
		let h = 0;
		let s = 0;
		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case rN:
					h = (gN - bN) / d + (gN < bN ? 6 : 0);
					break;
				case gN:
					h = (bN - rN) / d + 2;
					break;
				case bN:
					h = (rN - gN) / d + 4;
					break;
			}
			h *= 60;
		}
		return [h, s * 100, l * 100];
	}
	function hslToRgb(h: number, s: number, l: number): [number, number, number] {
		const sN = s / 100;
		const lN = l / 100;
		const c = (1 - Math.abs(2 * lN - 1)) * sN;
		const hp = h / 60;
		const x = c * (1 - Math.abs((hp % 2) - 1));
		let [r, g, b] = [0, 0, 0];
		if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
		else if (hp < 2) [r, g, b] = [x, c, 0];
		else if (hp < 3) [r, g, b] = [0, c, x];
		else if (hp < 4) [r, g, b] = [0, x, c];
		else if (hp < 5) [r, g, b] = [x, 0, c];
		else [r, g, b] = [c, 0, x];
		const m = lN - c / 2;
		return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
	}

	let lastEmitted = $state(value);
	$effect(() => {
		if (value === lastEmitted) return;
		const rgb = hexToRgb(value);
		if (!rgb) return;
		const [h, s, l] = rgbToHsl(...rgb);
		hue = h;
		sat = s;
		light = l;
		lastEmitted = value;
	});

	function emit() {
		const rgb = hslToRgb(hue, sat, light);
		const hex = rgbToHex(...rgb);
		lastEmitted = hex;
		value = hex;
	}

	function openPicker() {
		originalColor = value;
		const rgb = hexToRgb(value);
		if (rgb) {
			const [h, s, l] = rgbToHsl(...rgb);
			hue = h;
			sat = s;
			light = l;
		}
		open = true;
	}

	function closePicker() {
		if (value !== originalColor) {
			const next = [value, ...history.filter((c) => c.toUpperCase() !== value.toUpperCase())].slice(
				0,
				HISTORY_MAX
			);
			history = next;
			try {
				localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
			} catch {
				/* ignored */
			}
		}
		open = false;
	}

	function revertToOriginal() {
		const rgb = hexToRgb(originalColor);
		if (!rgb) return;
		const [h, s, l] = rgbToHsl(...rgb);
		hue = h;
		sat = s;
		light = l;
		emit();
	}

	function onPadDown(e: PointerEvent) {
		if (!padEl) return;
		padEl.setPointerCapture(e.pointerId);
		updatePad(e);
	}
	function onPadMove(e: PointerEvent) {
		if (!padEl?.hasPointerCapture(e.pointerId)) return;
		updatePad(e);
	}
	function onPadUp(e: PointerEvent) {
		padEl?.releasePointerCapture(e.pointerId);
	}
	function updatePad(e: PointerEvent) {
		if (!padEl) return;
		const rect = padEl.getBoundingClientRect();
		const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
		sat = x * 100;
		light = (1 - y) * 100;
		emit();
	}

	function onHueDown(e: PointerEvent) {
		if (!hueEl) return;
		hueEl.setPointerCapture(e.pointerId);
		updateHue(e);
	}
	function onHueMove(e: PointerEvent) {
		if (!hueEl?.hasPointerCapture(e.pointerId)) return;
		updateHue(e);
	}
	function onHueUp(e: PointerEvent) {
		hueEl?.releasePointerCapture(e.pointerId);
	}
	function updateHue(e: PointerEvent) {
		if (!hueEl) return;
		const rect = hueEl.getBoundingClientRect();
		const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
		hue = y * 360;
		emit();
	}

	function pickSwatch(hex: string) {
		const rgb = hexToRgb(hex);
		if (!rgb) return;
		const [h, s, l] = rgbToHsl(...rgb);
		hue = h;
		sat = s;
		light = l;
		emit();
	}

	type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> };
	async function openEyeDropper() {
		if (!hasEyeDropper) return;
		try {
			const Ctor = (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper;
			const ed = new Ctor();
			const res = await ed.open();
			pickSwatch(res.sRGBHex);
		} catch {
			/* User cancelled — silent, matches native picker UX. */
		}
	}

	$effect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') closePicker();
		}
		document.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	});

	let padBg = $derived.by(() => {
		const pure = rgbToHex(...hslToRgb(hue, 100, 50));
		return [
			`linear-gradient(to top, #000, transparent 50%, #fff)`,
			`linear-gradient(to right, #808080, ${pure})`
		].join(', ');
	});
	let padThumbStyle = $derived(`left: ${sat}%; top: ${100 - light}%`);
	let hueThumbStyle = $derived(`top: ${(hue / 360) * 100}%`);

	let rgb = $derived(hexToRgb(value) ?? [0, 0, 0]);
	let rgbDisplay = $derived(rgb.map((v) => v.toString().padStart(3, '0')).join(' · '));
	let hslDisplay = $derived(
		`${Math.round(hue).toString().padStart(3, '0')}° · ${Math.round(sat).toString().padStart(2, '0')}% · ${Math.round(light).toString().padStart(2, '0')}%`
	);

	let target = $derived.by(() => {
		const u = label.toUpperCase();
		if (u.includes('FOREGROUND')) return { tag: 'CLR-FG', full: 'FOREGROUND' };
		if (u.includes('BACKGROUND')) return { tag: 'CLR-BG', full: 'BACKGROUND' };
		if (u.includes('START')) return { tag: 'CLR-GF', full: 'GRADIENT START' };
		if (u.includes('END')) return { tag: 'CLR-GT', full: 'GRADIENT END' };
		return { tag: 'CLR', full: 'COLOR' };
	});

	function onOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closePicker();
	}
</script>

<button
	type="button"
	class="trigger"
	aria-label={label}
	aria-haspopup="dialog"
	aria-expanded={open}
	onclick={openPicker}
	style:--swatch-fill={value}
></button>

{#if open}
	<div
		class="overlay"
		role="presentation"
		onclick={onOverlayClick}
		onkeydown={(e) => e.key === 'Enter' && closePicker()}
	>
		<div
			bind:this={panelEl}
			class="panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cp-title"
		>
			<header class="plate-head">
				<span class="file-rubric">FILE · KMK·QR·{target.tag}</span>
				<button type="button" class="dismiss" aria-label="Close picker" onclick={closePicker}
					>×</button
				>
			</header>

			<div class="title-block">
				<div class="title-block-row">
					<span class="title-rubric">PLATE</span>
					<span class="title-num">P-02</span>
				</div>
				<h2 id="cp-title" class="title-h1">{target.full}</h2>
				<dl class="title-meta">
					<div>
						<dt>SHEET</dt>
						<dd>∞/∞</dd>
					</div>
					<div>
						<dt>METHOD</dt>
						<dd>HSL · LIVE</dd>
					</div>
				</dl>
			</div>

			<div class="canvas">
				<div class="canvas-frame">
					<span class="bracket bracket-tl" aria-hidden="true"></span>
					<span class="bracket bracket-tr" aria-hidden="true"></span>
					<span class="bracket bracket-bl" aria-hidden="true"></span>
					<span class="bracket bracket-br" aria-hidden="true"></span>

					<div
						bind:this={padEl}
						class="pad"
						style:background={padBg}
						onpointerdown={onPadDown}
						onpointermove={onPadMove}
						onpointerup={onPadUp}
						role="slider"
						tabindex="0"
						aria-label="Saturation and lightness"
						aria-valuemin="0"
						aria-valuemax="100"
						aria-valuenow={Math.round((sat + light) / 2)}
					>
						<span class="pad-thumb" style={padThumbStyle}></span>
					</div>

					<div
						bind:this={hueEl}
						class="hue"
						onpointerdown={onHueDown}
						onpointermove={onHueMove}
						onpointerup={onHueUp}
						role="slider"
						tabindex="0"
						aria-label="Hue"
						aria-valuemin="0"
						aria-valuemax="360"
						aria-valuenow={Math.round(hue)}
					>
						<span class="hue-thumb" style={hueThumbStyle}></span>
					</div>
				</div>

				<div class="compare">
					<div class="compare-cell" style:--swatch-fill={value}>
						<span class="compare-rubric">CURRENT</span>
					</div>
					<div class="compare-cell" style:--swatch-fill={originalColor}>
						<span class="compare-rubric">PREVIOUS</span>
					</div>
					{#if value.toUpperCase() !== originalColor.toUpperCase()}
						<button
							type="button"
							class="revert-btn"
							onclick={revertToOriginal}
							aria-label="Revert to previous color"
						>
							↶ REVERT
						</button>
					{/if}
				</div>
			</div>

			<section class="spec-cell">
				<header class="spec-head">
					<span class="spec-num">S-01</span>
					<span class="spec-rubric">SPECIMEN VALUES</span>
				</header>
				<dl class="spec-grid">
					<div>
						<dt>HEX</dt>
						<dd class="mono-val">{value}</dd>
					</div>
					<div>
						<dt>RGB</dt>
						<dd class="mono-val">{rgbDisplay}</dd>
					</div>
					<div>
						<dt>HSL</dt>
						<dd class="mono-val">{hslDisplay}</dd>
					</div>
				</dl>
			</section>

			<section class="spec-cell">
				<header class="spec-head">
					<span class="spec-num">S-02</span>
					<span class="spec-rubric">PALETTE</span>
				</header>
				<div class="palette">
					{#each PALETTE as sw}
						<button
							type="button"
							class="palette-chip"
							class:active={value.toUpperCase() === sw.hex.toUpperCase()}
							onclick={() => pickSwatch(sw.hex)}
							aria-label={sw.name}
							title={sw.name}
						>
							<span class="chip-fill" style:--swatch-fill={sw.hex}></span>
							<span class="chip-short">{sw.short}</span>
							<span class="chip-hex">{sw.hex}</span>
						</button>
					{/each}
				</div>
			</section>

			<section class="spec-cell">
				<header class="spec-head">
					<span class="spec-num">S-03</span>
					<span class="spec-rubric">HISTORY</span>
				</header>
				{#if history.length > 0}
					<div class="history">
						{#each Array(HISTORY_MAX) as _, i}
							{@const h = history[i]}
							{#if h}
								<button
									type="button"
									class="history-chip"
									onclick={() => pickSwatch(h)}
									aria-label={`Use ${h}`}
									title={h}
								>
									<span class="chip-fill" style:--swatch-fill={h}></span>
									<span class="chip-hex">{h}</span>
								</button>
							{:else}
								<span class="history-chip empty" aria-hidden="true">
									<span class="chip-fill empty-fill"></span>
									<span class="chip-hex">—</span>
								</span>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="history-empty">— no entries · pick a color and dismiss to log</p>
				{/if}
			</section>

			<footer class="plate-foot">
				{#if hasEyeDropper}
					<button
						type="button"
						class="eyedropper"
						onclick={openEyeDropper}
						aria-label="Pick color from screen"
					>
						<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
							<path
								d="M11 1.5l3.5 3.5-2 2-1.2-1.2-5 5L4 12.5l-1.5.5L2 12l.5-1.5L3.8 7l5-5-1.2-1.2 2-2zM5 9.5L8.5 6l1.5 1.5L6.5 11 5 9.5z"
								fill="currentColor"
							/>
						</svg>
						<span>PICK FROM SCREEN</span>
					</button>
				{:else}
					<span class="eyedropper-absent">⌘ EYEDROPPER · UNAVAILABLE IN THIS BROWSER</span>
				{/if}
				<span class="apply-rubric">↳ APPLIES TO {target.full}</span>
			</footer>
		</div>
	</div>
{/if}

<style>
	.trigger {
		appearance: none;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--rule-strong);
		border-radius: 2px;
		background: var(--swatch-fill, #000);
		cursor: pointer;
		transition: border-color var(--duration-fast) var(--ease);
	}
	@media (max-width: 720px) {
		.trigger {
			width: 32px;
			height: 32px;
		}
	}
	.trigger:hover {
		border-color: var(--accent);
	}
	.trigger:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Modal overlay */
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgb(0 0 0 / 0.58);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		animation: cp-fade-in 200ms var(--ease, ease-out);
	}
	@keyframes cp-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.panel {
		width: 100%;
		max-width: 540px;
		max-height: calc(100vh - 3rem);
		overflow-y: auto;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--ink);
		border-radius: 2px;
		box-shadow:
			0 16px 48px rgb(0 0 0 / 0.32),
			0 2px 8px rgb(0 0 0 / 0.18);
		position: relative;
		font-family: var(--font-mono);
		animation: cp-rise 240ms var(--ease, ease-out);
	}
	@keyframes cp-rise {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@media (max-width: 720px) {
		.overlay {
			padding: 0;
			align-items: end;
		}
		.panel {
			max-width: 100%;
			max-height: 92vh;
			border-radius: 8px 8px 0 0;
			border-bottom: none;
		}
	}

	/* Plate head — file rubric corner */
	.plate-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.7rem 1.2rem;
		border-bottom: 1px solid var(--rule-strong);
		background: var(--paper);
	}
	.file-rubric {
		font-size: var(--fs-help, 12px);
		letter-spacing: 0.16em;
		color: var(--micro, #8a8478);
		text-transform: uppercase;
	}
	.dismiss {
		appearance: none;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 2px;
		font-family: var(--font-mono);
		font-size: 18px;
		line-height: 1;
		color: var(--ink);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
	}
	.dismiss:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.dismiss:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Title block */
	.title-block {
		padding: 1.1rem 1.2rem 0.85rem;
		border-bottom: 1px dashed var(--rule);
	}
	.title-block-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.3rem;
	}
	.title-rubric {
		font-size: var(--fs-help, 12px);
		letter-spacing: 0.18em;
		color: var(--micro, #8a8478);
	}
	.title-num {
		font-size: var(--fs-help, 12px);
		letter-spacing: 0.12em;
		color: var(--accent);
		font-weight: 500;
	}
	.title-h1 {
		font-family: var(--font-display, 'Fraunces', serif);
		font-weight: 500;
		font-size: clamp(24px, 4vw, 32px);
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0 0 0.55rem;
		color: var(--ink);
	}
	.title-meta {
		display: flex;
		gap: 1.8rem;
		margin: 0;
		padding: 0;
	}
	.title-meta div {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.title-meta dt {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--micro, #8a8478);
		margin: 0;
	}
	.title-meta dd {
		font-size: var(--fs-help, 12px);
		letter-spacing: 0.06em;
		color: var(--ink);
		margin: 0;
	}

	/* Canvas (pad + hue + compare) */
	.canvas {
		padding: 1.1rem 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.95rem;
		border-bottom: 1px dashed var(--rule);
	}
	.canvas-frame {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 28px;
		gap: 0.75rem;
		padding: 12px;
		border: 1px solid var(--rule);
		background: var(--paper-warm, var(--paper));
	}
	.bracket {
		position: absolute;
		width: 10px;
		height: 10px;
		border-color: var(--ink);
		border-style: solid;
		border-width: 0;
	}
	.bracket-tl {
		top: -1px;
		left: -1px;
		border-top-width: 1.5px;
		border-left-width: 1.5px;
	}
	.bracket-tr {
		top: -1px;
		right: -1px;
		border-top-width: 1.5px;
		border-right-width: 1.5px;
	}
	.bracket-bl {
		bottom: -1px;
		left: -1px;
		border-bottom-width: 1.5px;
		border-left-width: 1.5px;
	}
	.bracket-br {
		bottom: -1px;
		right: -1px;
		border-bottom-width: 1.5px;
		border-right-width: 1.5px;
	}

	.pad {
		position: relative;
		width: 100%;
		height: 220px;
		border: 1px solid var(--rule-strong);
		border-radius: 1px;
		cursor: crosshair;
		touch-action: none;
	}
	@media (max-width: 720px) {
		.pad {
			height: 200px;
		}
	}
	.pad:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pad-thumb {
		position: absolute;
		width: 16px;
		height: 16px;
		margin-left: -8px;
		margin-top: -8px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow:
			0 0 0 1px rgb(0 0 0 / 0.55),
			0 1px 3px rgb(0 0 0 / 0.45);
		pointer-events: none;
	}

	.hue {
		position: relative;
		width: 28px;
		height: 220px;
		border: 1px solid var(--rule-strong);
		border-radius: 1px;
		background: linear-gradient(
			to bottom,
			#f00 0%,
			#ff0 17%,
			#0f0 33%,
			#0ff 50%,
			#00f 67%,
			#f0f 83%,
			#f00 100%
		);
		cursor: ns-resize;
		touch-action: none;
	}
	@media (max-width: 720px) {
		.hue {
			height: 200px;
		}
	}
	.hue:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.hue-thumb {
		position: absolute;
		left: -3px;
		right: -3px;
		height: 6px;
		margin-top: -3px;
		border: 1px solid #fff;
		border-radius: 1px;
		background: rgb(0 0 0 / 0.42);
		pointer-events: none;
	}

	.compare {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 0.55rem;
		align-items: stretch;
	}
	.compare-cell {
		position: relative;
		height: 44px;
		border: 1px solid var(--rule);
		background:
			linear-gradient(45deg, #ddd 25%, transparent 25%),
			linear-gradient(-45deg, #ddd 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #ddd 75%),
			linear-gradient(-45deg, transparent 75%, #ddd 75%);
		background-size: 10px 10px;
		background-position:
			0 0,
			0 5px,
			5px -5px,
			-5px 0;
	}
	.compare-cell::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--swatch-fill);
	}
	.compare-rubric {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		z-index: 1;
		font-size: 10px;
		letter-spacing: 0.16em;
		padding: 2px 5px;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--rule);
	}
	.revert-btn {
		appearance: none;
		padding: 0 0.7rem;
		background: transparent;
		border: 1px solid var(--rule);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		color: var(--ink);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
	}
	.revert-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.revert-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Specimen cells */
	.spec-cell {
		padding: 0.9rem 1.2rem;
		border-bottom: 1px dashed var(--rule);
	}
	.spec-cell:last-of-type {
		border-bottom: none;
	}
	.spec-head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-bottom: 0.7rem;
	}
	.spec-num {
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--accent);
		font-weight: 500;
	}
	.spec-rubric {
		font-size: 10px;
		letter-spacing: 0.22em;
		color: var(--micro, #8a8478);
	}

	.spec-grid {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.4rem 1rem;
	}
	.spec-grid div {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
		min-width: 0;
	}
	.spec-grid dt {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--micro, #8a8478);
		margin: 0;
	}
	.spec-grid dd {
		margin: 0;
	}
	.mono-val {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	/* Palette */
	.palette {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.45rem;
	}
	@media (max-width: 480px) {
		.palette {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	.palette-chip {
		appearance: none;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: 0;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 1px;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
		overflow: hidden;
	}
	.palette-chip:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.palette-chip:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.palette-chip.active {
		border-color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.chip-fill {
		display: block;
		width: 100%;
		aspect-ratio: 1.6;
		background: var(--swatch-fill);
		border-bottom: 1px solid var(--rule);
	}
	.chip-short {
		display: block;
		padding: 0.22rem 0.25rem 0;
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--ink);
		text-align: center;
	}
	.chip-hex {
		display: block;
		padding: 0.05rem 0.25rem 0.25rem;
		font-size: 9px;
		letter-spacing: 0.05em;
		color: var(--micro, #8a8478);
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	/* History */
	.history {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.45rem;
	}
	@media (max-width: 480px) {
		.history {
			grid-template-columns: repeat(6, 1fr);
		}
	}
	.history-chip {
		appearance: none;
		display: flex;
		flex-direction: column;
		padding: 0;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 1px;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
		overflow: hidden;
	}
	.history-chip:hover:not(.empty) {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.history-chip:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.history-chip.empty {
		cursor: default;
		opacity: 0.45;
	}
	.empty-fill {
		background:
			repeating-linear-gradient(
				45deg,
				transparent 0,
				transparent 5px,
				var(--rule) 5px,
				var(--rule) 6px
			),
			var(--paper-warm, var(--paper));
	}
	.history-empty {
		margin: 0;
		font-size: var(--fs-help, 12px);
		letter-spacing: 0.04em;
		color: var(--micro, #8a8478);
		font-style: italic;
	}

	/* Foot */
	.plate-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1.2rem;
		background: var(--paper-warm, var(--paper));
		border-top: 1px solid var(--rule-strong);
	}
	.eyedropper {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.85rem;
		background: var(--ink);
		color: var(--paper);
		border: 1px solid var(--ink);
		border-radius: 1px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.14em;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
	}
	.eyedropper:hover {
		background: var(--accent);
		border-color: var(--accent);
	}
	.eyedropper:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.eyedropper-absent {
		font-size: 10px;
		letter-spacing: 0.14em;
		color: var(--micro, #8a8478);
	}
	.apply-rubric {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--micro, #8a8478);
		text-transform: uppercase;
	}

	@media (max-width: 480px) {
		.plate-foot {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}
		.eyedropper {
			justify-content: center;
		}
		.apply-rubric {
			text-align: center;
		}
	}
</style>
