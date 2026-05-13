<script lang="ts">
	import { onMount, tick } from 'svelte';

	type Props = {
		value: string;
		label: string;
	};

	let { value = $bindable(), label }: Props = $props();

	/* Teleport the overlay+panel to document.body so they escape any
	 * ancestor that creates a `position: fixed` containing block. The
	 * generator's `.controls` column runs a `fade-up both` animation
	 * that leaves `transform: translateY(0)` on the computed style —
	 * per CSS spec, any non-`none` transform makes `position: fixed`
	 * resolve to that ancestor instead of the viewport, so without
	 * the portal the panel renders inside the form column off-screen
	 * and the overlay's `inset: 0` only darkens that column. */
	function portal(node: HTMLElement) {
		if (typeof document === 'undefined') return;
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let padEl = $state<HTMLDivElement | null>(null);
	let hueEl = $state<HTMLDivElement | null>(null);
	let hasEyeDropper = $state(false);
	let saved = $state<string[]>([]);

	const PANEL_WIDTH = 420;
	const MARGIN = 12;
	const GAP = 8;
	const MOBILE_BREAKPOINT = 720;
	const SAVED_KEY = 'kemek-qr:color-saved';
	const SAVED_MAX = 6;

	/* Panel coords are always set; defaults are a safe top-centered
	 * position so the panel is visible even before computePosition()
	 * has measured the trigger. computePosition() runs after the
	 * panel mounts and re-anchors near the click. */
	let panelLeft = $state(MARGIN);
	let panelTop = $state(MARGIN);

	let hue = $state(0);
	let sat = $state(0);
	let light = $state(0);

	const PALETTE = [
		{ hex: '#000000', name: 'Black' },
		{ hex: '#1A1815', name: 'Ink' },
		{ hex: '#333333', name: 'Charcoal' },
		{ hex: '#C53A1F', name: 'Accent' },
		{ hex: '#16140F', name: 'Paper dark' },
		{ hex: '#F2EBDD', name: 'Paper' },
		{ hex: '#FFFFFF', name: 'White' }
	];

	onMount(() => {
		hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
		try {
			const raw = localStorage.getItem(SAVED_KEY);
			if (raw) saved = JSON.parse(raw);
		} catch {
			/* saved is a luxury, not load-bearing */
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

	function computePosition() {
		if (typeof window === 'undefined') return;
		/* Mobile uses CSS bottom-sheet positioning that the media query
		 * forces with !important — these coords are ignored. */
		if (window.innerWidth <= MOBILE_BREAKPOINT) {
			panelLeft = 0;
			panelTop = 0;
			return;
		}
		const panelW = Math.min(PANEL_WIDTH, window.innerWidth - MARGIN * 2);
		const panelH = panelEl?.offsetHeight ?? 460;

		if (!triggerEl) {
			/* Fallback: top-center if we have no trigger to anchor to. */
			panelLeft = Math.max(MARGIN, window.innerWidth / 2 - panelW / 2);
			panelTop = MARGIN;
			return;
		}
		const trigRect = triggerEl.getBoundingClientRect();
		let left = trigRect.left + trigRect.width / 2 - panelW / 2;
		left = Math.max(MARGIN, Math.min(window.innerWidth - panelW - MARGIN, left));

		const spaceBelow = window.innerHeight - trigRect.bottom - MARGIN;
		const spaceAbove = trigRect.top - MARGIN;
		let top: number;
		if (panelH + GAP <= spaceBelow) {
			top = trigRect.bottom + GAP;
		} else if (panelH + GAP <= spaceAbove) {
			top = trigRect.top - panelH - GAP;
		} else {
			top = MARGIN;
		}
		panelLeft = left;
		panelTop = top;
	}

	async function openPicker() {
		const rgb = hexToRgb(value);
		if (rgb) {
			const [h, s, l] = rgbToHsl(...rgb);
			hue = h;
			sat = s;
			light = l;
		}
		/* Pre-position before showing so the first paint lands at the
		 * right spot (we don't have panelH yet, so this uses the 460-px
		 * estimate; recompute below once we can measure). */
		computePosition();
		open = true;
		await tick();
		computePosition();
	}

	function closePicker() {
		open = false;
	}

	function saveCurrent() {
		const v = value.toUpperCase();
		const next = [value, ...saved.filter((c) => c.toUpperCase() !== v)].slice(0, SAVED_MAX);
		saved = next;
		try {
			localStorage.setItem(SAVED_KEY, JSON.stringify(next));
		} catch {
			/* ignored */
		}
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
			/* user cancelled — silent */
		}
	}

	$effect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') closePicker();
		}
		function onResize() {
			computePosition();
		}
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', onResize);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onResize);
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
	let rgbDisplay = $derived(rgb.map((v) => v.toString().padStart(3, '0')).join('·'));
	let hslDisplay = $derived(
		`${Math.round(hue).toString().padStart(3, '0')}° ${Math.round(sat).toString().padStart(2, '0')}% ${Math.round(light).toString().padStart(2, '0')}%`
	);

	let targetTag = $derived.by(() => {
		const u = label.toUpperCase();
		if (u.includes('FOREGROUND')) return 'CLR-FG';
		if (u.includes('BACKGROUND')) return 'CLR-BG';
		if (u.includes('START')) return 'CLR-GF';
		if (u.includes('END')) return 'CLR-GT';
		return 'CLR';
	});

	let saveDisabled = $derived(saved.some((c) => c.toUpperCase() === value.toUpperCase()));

	function onOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closePicker();
	}
</script>

<button
	bind:this={triggerEl}
	type="button"
	class="trigger"
	aria-label={label}
	aria-haspopup="dialog"
	aria-expanded={open}
	onclick={openPicker}
	style:--swatch-fill={value}
></button>

{#if open}
	<div use:portal class="overlay" role="presentation" onclick={onOverlayClick}>
		<div
			bind:this={panelEl}
			class="panel"
			style:left="{panelLeft}px"
			style:top="{panelTop}px"
			role="dialog"
			aria-modal="true"
			aria-label={label}
		>
			<header class="head">
				<span class="head-rubric">FILE · KMK·QR·{targetTag}</span>
				<span class="head-swatch" style:--swatch-fill={value}></span>
				<span class="head-hex">{value}</span>
				<button type="button" class="dismiss" aria-label="Close picker" onclick={closePicker}
					>×</button
				>
			</header>

			<div class="body">
				<div class="canvas">
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

				<div class="readout" aria-live="polite">
					<span class="readout-rubric">RGB</span>
					<span class="readout-val">{rgbDisplay}</span>
					<span class="readout-sep">·</span>
					<span class="readout-rubric">HSL</span>
					<span class="readout-val">{hslDisplay}</span>
				</div>

				<section class="cell">
					<header class="cell-head">
						<span class="cell-num">S-02</span>
						<span class="cell-rubric">PALETTE</span>
					</header>
					<div class="grid grid-7">
						{#each PALETTE as sw}
							<button
								type="button"
								class="chip"
								class:active={value.toUpperCase() === sw.hex.toUpperCase()}
								onclick={() => pickSwatch(sw.hex)}
								aria-label={sw.name}
								title="{sw.name} · {sw.hex}"
								style:--swatch-fill={sw.hex}
							></button>
						{/each}
					</div>
				</section>

				<section class="cell">
					<header class="cell-head">
						<span class="cell-num">S-03</span>
						<span class="cell-rubric">SAVED</span>
						<span class="cell-counter">{saved.length}/{SAVED_MAX}</span>
					</header>
					<div class="grid grid-7">
						<button
							type="button"
							class="add-chip"
							onclick={saveCurrent}
							disabled={saveDisabled}
							aria-label="Save current color"
							title={saveDisabled ? `${value} already saved` : `Save ${value}`}
						>
							<span aria-hidden="true">+</span>
						</button>
						{#each Array(SAVED_MAX) as _, i}
							{@const h = saved[i]}
							{#if h}
								<button
									type="button"
									class="chip"
									class:active={value.toUpperCase() === h.toUpperCase()}
									onclick={() => pickSwatch(h)}
									aria-label={`Use ${h}`}
									title={h}
									style:--swatch-fill={h}
								></button>
							{:else}
								<span class="chip empty" aria-hidden="true"></span>
							{/if}
						{/each}
					</div>
				</section>
			</div>

			<footer class="foot">
				{#if hasEyeDropper}
					<button
						type="button"
						class="eyedropper"
						onclick={openEyeDropper}
						aria-label="Pick color from screen"
					>
						<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
							<path
								d="M11 1.5l3.5 3.5-2 2-1.2-1.2-5 5L4 12.5l-1.5.5L2 12l.5-1.5L3.8 7l5-5-1.2-1.2 2-2zM5 9.5L8.5 6l1.5 1.5L6.5 11 5 9.5z"
								fill="currentColor"
							/>
						</svg>
						<span>PICK FROM SCREEN</span>
					</button>
				{:else}
					<span></span>
				{/if}
				<span class="apply-rubric">↳ {targetTag}</span>
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

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgb(0 0 0 / 0.58);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		animation: cp-fade 160ms ease-out;
	}
	@keyframes cp-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.panel {
		position: fixed;
		width: 100%;
		max-width: 420px;
		max-height: calc(100dvh - 1.5rem);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--paper);
		color: var(--ink);
		border: 1px solid var(--ink);
		border-radius: 2px;
		box-shadow:
			0 14px 36px rgb(0 0 0 / 0.3),
			0 2px 6px rgb(0 0 0 / 0.18);
		font-family: var(--font-mono);
		animation: cp-fade 200ms ease-out;
	}
	/* Head + foot stay pinned; body scrolls when content > available
	 * height. Required for landscape phones where the panel max-height
	 * (94dvh ≈ 300 px at 320-px tall viewport) is smaller than the
	 * combined section heights — without this, PALETTE / SAVED / FOOT
	 * get clipped and the user can't reach the brand swatches or the
	 * dismiss button. */
	.body {
		flex: 1 1 auto;
		overflow-y: auto;
		min-height: 0;
		-webkit-overflow-scrolling: touch;
	}
	@media (max-width: 720px) {
		.panel {
			/* Bottom-sheet on mobile — floats with margin on all four
			 * sides instead of full-bleed, so the modal reads as a
			 * floating card and the viewport edges stay legible.
			 * !important beats the inline left/top set by
			 * computePosition(). */
			left: 12px !important;
			right: 12px;
			top: auto !important;
			bottom: 12px;
			max-width: calc(100% - 24px);
			max-height: calc(100dvh - 24px);
			border-radius: 6px;
		}
	}

	.head {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.85rem;
		border-bottom: 1px solid var(--rule-strong);
		background: var(--paper);
	}
	.head-rubric {
		font-size: 11px;
		letter-spacing: 0.14em;
		color: var(--micro, #8a8478);
		text-transform: uppercase;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.head-swatch {
		width: 14px;
		height: 14px;
		border: 1px solid var(--rule-strong);
		border-radius: 1px;
		background: var(--swatch-fill);
	}
	.head-hex {
		font-size: 12px;
		letter-spacing: 0.06em;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}
	.dismiss {
		appearance: none;
		width: 24px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 2px;
		font-family: var(--font-mono);
		font-size: 16px;
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

	.canvas {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 26px;
		gap: 0.55rem;
		padding: 0.85rem;
		border-bottom: 1px dashed var(--rule);
	}
	.bracket {
		position: absolute;
		width: 9px;
		height: 9px;
		border-color: var(--ink);
		border-style: solid;
		border-width: 0;
	}
	.bracket-tl {
		top: 8px;
		left: 8px;
		border-top-width: 1.5px;
		border-left-width: 1.5px;
	}
	.bracket-tr {
		top: 8px;
		right: 8px;
		border-top-width: 1.5px;
		border-right-width: 1.5px;
	}
	.bracket-bl {
		bottom: 8px;
		left: 8px;
		border-bottom-width: 1.5px;
		border-left-width: 1.5px;
	}
	.bracket-br {
		bottom: 8px;
		right: 8px;
		border-bottom-width: 1.5px;
		border-right-width: 1.5px;
	}

	.pad {
		position: relative;
		width: 100%;
		height: 180px;
		border: 1px solid var(--rule-strong);
		border-radius: 1px;
		cursor: crosshair;
		touch-action: none;
	}
	@media (max-width: 480px) {
		.pad {
			height: 160px;
		}
	}
	@media (max-width: 360px) {
		.pad {
			height: 140px;
		}
	}
	/* Landscape phones (typically 320 – 414 px tall) need a much
	 * smaller canvas to keep PALETTE + SAVED + FOOT above the fold.
	 * The body wrapper scrolls if they still don't all fit. */
	@media (orientation: landscape) and (max-height: 500px) {
		.pad {
			height: 110px;
		}
	}
	.pad:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pad-thumb {
		position: absolute;
		width: 14px;
		height: 14px;
		margin-left: -7px;
		margin-top: -7px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow:
			0 0 0 1px rgb(0 0 0 / 0.55),
			0 1px 3px rgb(0 0 0 / 0.45);
		pointer-events: none;
	}

	.hue {
		position: relative;
		width: 26px;
		height: 180px;
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
	@media (max-width: 480px) {
		.hue {
			height: 160px;
		}
	}
	@media (max-width: 360px) {
		.hue {
			height: 140px;
		}
	}
	@media (orientation: landscape) and (max-height: 500px) {
		.hue {
			height: 110px;
		}
	}
	.hue:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.hue-thumb {
		position: absolute;
		left: -2px;
		right: -2px;
		height: 5px;
		margin-top: -2.5px;
		border: 1px solid #fff;
		border-radius: 1px;
		background: rgb(0 0 0 / 0.42);
		pointer-events: none;
	}

	.readout {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.35rem 0.4rem;
		padding: 0.55rem 0.85rem;
		border-bottom: 1px dashed var(--rule);
		font-size: 11px;
	}
	.readout-rubric {
		letter-spacing: 0.18em;
		color: var(--micro, #8a8478);
	}
	.readout-val {
		letter-spacing: 0.04em;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}
	.readout-sep {
		color: var(--rule);
	}

	.cell {
		padding: 0.55rem 0.85rem;
		border-bottom: 1px dashed var(--rule);
	}
	.cell-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.45rem;
	}
	.cell-num {
		font-size: 10px;
		letter-spacing: 0.16em;
		color: var(--accent);
		font-weight: 500;
	}
	.cell-rubric {
		font-size: 10px;
		letter-spacing: 0.22em;
		color: var(--micro, #8a8478);
	}
	.cell-counter {
		margin-left: auto;
		font-size: 9px;
		letter-spacing: 0.08em;
		color: var(--micro, #8a8478);
		font-variant-numeric: tabular-nums;
	}

	.grid {
		display: grid;
		gap: 0.35rem;
	}
	.grid-7 {
		grid-template-columns: repeat(7, 1fr);
	}

	.chip {
		appearance: none;
		width: 100%;
		aspect-ratio: 1.4;
		padding: 0;
		background: var(--swatch-fill);
		border: 1px solid var(--rule-strong);
		border-radius: 1px;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
	}
	.chip:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.chip:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.chip.active {
		border-color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.chip.empty {
		cursor: default;
		background:
			repeating-linear-gradient(
				45deg,
				transparent 0,
				transparent 5px,
				var(--rule) 5px,
				var(--rule) 6px
			),
			var(--paper-warm, var(--paper));
		opacity: 0.55;
	}
	.chip.empty:hover {
		border-color: var(--rule-strong);
		transform: none;
	}

	.add-chip {
		appearance: none;
		width: 100%;
		aspect-ratio: 1.4;
		padding: 0;
		background: var(--paper-warm, var(--paper));
		border: 1px dashed var(--rule-strong);
		border-radius: 1px;
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 18px;
		font-weight: 400;
		line-height: 1;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: all var(--duration-fast) var(--ease);
	}
	.add-chip:hover:not(:disabled) {
		border-style: solid;
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
	}
	.add-chip:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.add-chip:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem;
		padding: 0.55rem 0.85rem;
		background: var(--paper-warm, var(--paper));
		border-top: 1px solid var(--rule-strong);
	}
	.eyedropper {
		appearance: none;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.35rem 0.7rem;
		background: var(--ink);
		color: var(--paper);
		border: 1px solid var(--ink);
		border-radius: 1px;
		font-family: var(--font-mono);
		font-size: 10px;
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
	.apply-rubric {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--micro, #8a8478);
		text-transform: uppercase;
	}
</style>
