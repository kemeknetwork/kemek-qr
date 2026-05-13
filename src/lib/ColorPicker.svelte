<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		value: string;
		label: string;
	};

	let { value = $bindable(), label }: Props = $props();

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let popoverEl = $state<HTMLDivElement | null>(null);
	let padEl = $state<HTMLDivElement | null>(null);
	let hueEl = $state<HTMLDivElement | null>(null);

	/* HSL is held internally so the 2D pad + hue slider can be driven
	 * independently. The hex `value` is the round-trip source of truth
	 * — we re-derive HSL whenever value changes externally. */
	let hue = $state(0);
	let sat = $state(0);
	let light = $state(0);

	/* Detect EyeDropper API. Chrome / Edge ≥ 95 support it; Firefox /
	 * Safari do not as of writing. Button hides when unsupported. */
	let hasEyeDropper = $state(false);
	onMount(() => {
		hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
	});

	/* Brand swatches — curated for QR scannability + brand voice. Black
	 * and white anchor the safe defaults; ink/paper/accent pull from the
	 * site's design tokens; mid-gray gives a soft-on-cream option that
	 * still scans cleanly. */
	const SWATCHES = [
		{ hex: '#000000', label: 'Black' },
		{ hex: '#1A1815', label: 'Ink' },
		{ hex: '#333333', label: 'Charcoal' },
		{ hex: '#C53A1F', label: 'Accent' },
		{ hex: '#16140F', label: 'Paper dark' },
		{ hex: '#F2EBDD', label: 'Paper' },
		{ hex: '#FFFFFF', label: 'White' }
	];

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

	/* Pull external value → internal HSL when it changes, but avoid the
	 * round-trip-jitter feedback loop: if our last emitted hex matches
	 * the incoming value, skip. */
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

	/* Pointer-driven 2D pad: x = saturation 0..100, y = lightness 100..0
	 * (top = bright). Pointer-capture so drag works even when the cursor
	 * leaves the pad mid-stroke. */
	function onPadDown(e: PointerEvent) {
		if (!padEl) return;
		padEl.setPointerCapture(e.pointerId);
		updateFromPad(e);
	}
	function onPadMove(e: PointerEvent) {
		if (!padEl?.hasPointerCapture(e.pointerId)) return;
		updateFromPad(e);
	}
	function onPadUp(e: PointerEvent) {
		padEl?.releasePointerCapture(e.pointerId);
	}
	function updateFromPad(e: PointerEvent) {
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
		updateFromHue(e);
	}
	function onHueMove(e: PointerEvent) {
		if (!hueEl?.hasPointerCapture(e.pointerId)) return;
		updateFromHue(e);
	}
	function onHueUp(e: PointerEvent) {
		hueEl?.releasePointerCapture(e.pointerId);
	}
	function updateFromHue(e: PointerEvent) {
		if (!hueEl) return;
		const rect = hueEl.getBoundingClientRect();
		const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		hue = x * 360;
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

	/* Outside-click + Escape close. Pointerdown beats click for menu
	 * dismissal because click can fire after the popover already moved
	 * focus to a swatch button. */
	$effect(() => {
		if (!open) return;
		function onDown(e: PointerEvent) {
			const t = e.target as Node;
			if (popoverEl?.contains(t) || triggerEl?.contains(t)) return;
			open = false;
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') open = false;
		}
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	});

	/* The 2D pad background fades from full-saturation pure-hue (right
	 * edge, mid-vertical) through white (top), black (bottom), and gray
	 * (left edge). Layered gradients achieve this cheaply. */
	let padBg = $derived.by(() => {
		const pure = rgbToHex(...hslToRgb(hue, 100, 50));
		return [
			`linear-gradient(to top, #000, transparent 50%, #fff)`,
			`linear-gradient(to right, #808080, ${pure})`
		].join(', ');
	});
	let padThumbStyle = $derived(`left: ${sat}%; top: ${100 - light}%`);
	let hueThumbStyle = $derived(`left: ${(hue / 360) * 100}%`);
	let triggerFill = $derived(value);
</script>

<span class="color-trigger">
	<button
		bind:this={triggerEl}
		type="button"
		class="swatch-btn"
		aria-label={label}
		aria-haspopup="dialog"
		aria-expanded={open}
		onclick={() => (open = !open)}
		style:--swatch-fill={triggerFill}
	></button>

	{#if open}
		<div bind:this={popoverEl} class="popover" role="dialog" aria-label="{label} picker">
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

			<div class="popover-row">
				<span class="popover-hex">{value}</span>
				{#if hasEyeDropper}
					<button
						type="button"
						class="eyedropper-btn"
						onclick={openEyeDropper}
						aria-label="Pick color from screen"
						title="Pick color from screen"
					>
						<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
							<path
								d="M11 1.5l3.5 3.5-2 2-1.2-1.2-5 5L4 12.5l-1.5.5L2 12l.5-1.5L3.8 7l5-5-1.2-1.2 2-2zM5 9.5L8.5 6l1.5 1.5L6.5 11 5 9.5z"
								fill="currentColor"
							/>
						</svg>
					</button>
				{/if}
			</div>

			<div class="swatches" role="group" aria-label="Brand swatches">
				{#each SWATCHES as sw}
					<button
						type="button"
						class="swatch-chip"
						class:active={value.toUpperCase() === sw.hex.toUpperCase()}
						onclick={() => pickSwatch(sw.hex)}
						aria-label={sw.label}
						title={sw.label}
						style:--swatch-fill={sw.hex}
					></button>
				{/each}
			</div>
		</div>
	{/if}
</span>

<style>
	.color-trigger {
		position: relative;
		display: inline-flex;
	}
	.swatch-btn {
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
		.swatch-btn {
			width: 32px;
			height: 32px;
		}
	}
	.swatch-btn:hover {
		border-color: var(--accent);
	}
	.swatch-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.popover {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 50;
		width: 240px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		background: var(--paper);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius-sm);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
	}
	@media (max-width: 720px) {
		.popover {
			width: 260px;
		}
	}

	.pad {
		position: relative;
		width: 100%;
		height: 140px;
		border: 1px solid var(--rule);
		border-radius: 2px;
		cursor: crosshair;
		touch-action: none;
	}
	.pad-thumb {
		position: absolute;
		width: 12px;
		height: 12px;
		margin-left: -6px;
		margin-top: -6px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5);
		pointer-events: none;
	}

	.hue {
		position: relative;
		width: 100%;
		height: 14px;
		border: 1px solid var(--rule);
		border-radius: 2px;
		background: linear-gradient(
			to right,
			#f00 0%,
			#ff0 17%,
			#0f0 33%,
			#0ff 50%,
			#00f 67%,
			#f0f 83%,
			#f00 100%
		);
		cursor: ew-resize;
		touch-action: none;
	}
	.hue-thumb {
		position: absolute;
		top: -2px;
		bottom: -2px;
		width: 6px;
		margin-left: -3px;
		border: 1px solid #fff;
		border-radius: 1px;
		background: rgb(0 0 0 / 0.35);
		pointer-events: none;
	}

	.popover-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.popover-hex {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		letter-spacing: 0.05em;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.eyedropper-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 2px;
		color: var(--ghost);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease);
	}
	.eyedropper-btn:hover {
		color: var(--ink);
		border-color: var(--accent);
	}
	.eyedropper-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.3rem;
	}
	.swatch-chip {
		appearance: none;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 1px solid var(--rule-strong);
		border-radius: 2px;
		background: var(--swatch-fill, #000);
		cursor: pointer;
		transition:
			transform var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease);
	}
	.swatch-chip:hover {
		border-color: var(--accent);
		transform: scale(1.08);
	}
	.swatch-chip:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
	.swatch-chip.active {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}
</style>
