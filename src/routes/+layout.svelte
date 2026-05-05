<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/state';
	import { CONTENT_TYPES, TYPE_LABELS, type ContentType } from '$lib/types';

	let { children } = $props();

	/* Theme handling. mode is initialized synchronously at script-eval
	 * time on the client so the toggle's active-state is correct on
	 * first paint instead of waiting for onMount. SSR returns 'light'
	 * (no document available); hydration corrects it on the first
	 * client render. */
	type Mode = 'light' | 'dark';
	const THEME_KEY = 'kemek-qr:theme';

	function readInitialMode(): Mode {
		if (typeof document === 'undefined') return 'light';
		const attr = document.documentElement.getAttribute('data-theme');
		if (attr === 'dark' || attr === 'light') return attr;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	let mode = $state<Mode>(readInitialMode());

	function applyTheme(next: Mode) {
		mode = next;
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', next);
		try {
			localStorage.setItem(THEME_KEY, next);
		} catch {
			/* private mode / quota — explicit override won't persist
			 * across reloads but works for the current session. */
		}
	}

	function toggleTone() {
		applyTheme(mode === 'dark' ? 'light' : 'dark');
	}

	onMount(() => {
		/* If hydration finished on a different mode than the inline
		 * FOUC script applied (rare — only when matchMedia disagrees
		 * with the saved attribute), re-sync. */
		const live = readInitialMode();
		if (live !== mode) mode = live;

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onSystemChange = () => {
			let saved: string | null = null;
			try {
				saved = localStorage.getItem(THEME_KEY);
			} catch {
				/* localStorage may throw in private mode — treat as no
				 * override; the system preference takes effect. */
			}
			if (saved !== 'dark' && saved !== 'light') {
				mode = mq.matches ? 'dark' : 'light';
			}
		};
		mq.addEventListener('change', onSystemChange);
		return () => mq.removeEventListener('change', onSystemChange);
	});

	/* Map a route pathname to its ContentType. `/` is the URL generator
	 * (canonical landing); each /<type> is a per-type landing page. */
	const ROUTE_FOR_TYPE: Record<ContentType, string> = {
		url: '/',
		text: '/text',
		wifi: '/wifi',
		vcard: '/vcard',
		email: '/email',
		sms: '/sms',
		phone: '/phone',
		geo: '/geo'
	};

	/* Plate numbers — the drawing-set ordering. URL is plate 01 (the
	 * canonical landing); the rest follow in spec.section order so the
	 * sequence reads like a published volume. */
	const PLATE: Record<ContentType, string> = {
		url: '01',
		text: '02',
		wifi: '03',
		vcard: '04',
		email: '05',
		sms: '06',
		phone: '07',
		geo: '08'
	};

	const activeType = $derived.by<ContentType>(() => {
		const path = page.url.pathname || '/';
		if (path === '/') return 'url';
		const match = (CONTENT_TYPES as readonly ContentType[]).find(
			(t) => t !== 'url' && (path === ROUTE_FOR_TYPE[t] || path.startsWith(`${ROUTE_FOR_TYPE[t]}/`))
		);
		return match ?? 'url';
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="alternate icon" href="/favicon-32.png" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta property="og:image" content="https://qr.kemek.com/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:image" content="https://qr.kemek.com/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="page-frame">
	<a href="#main" class="skip-link">Skip to generator</a>
	<header class="masthead">
		<div class="masthead-inner">
			<a class="brand" href="/">
				<span class="brand-mark" aria-hidden="true"></span>
				<span class="brand-name">kemek<span class="brand-slash">/</span>qr</span>
			</a>
			<a class="pill" href="/about" aria-label="About — privacy posture and license">
				NO SIGNUP <span class="pill-dot">·</span> NO TRACKING <span class="pill-dot">·</span> NO UPLOAD
				<span class="pill-arrow" aria-hidden="true">→</span>
			</a>
		</div>
		<nav class="type-nav" aria-label="QR content types — plate index">
			<div class="type-nav-inner">
				<span class="type-nav-rubric" aria-hidden="true">PLATE INDEX</span>
				{#each CONTENT_TYPES as t}
					<a
						class="type-link"
						class:active={activeType === t}
						href={ROUTE_FOR_TYPE[t]}
						aria-current={activeType === t ? 'page' : undefined}
					>
						<span class="plate-num">PL.{PLATE[t]}</span>
						<span class="plate-label">{TYPE_LABELS[t]}</span>
					</a>
				{/each}
			</div>
		</nav>
	</header>

	<main id="main" tabindex="-1">
		{@render children()}
	</main>

	<footer class="colophon">
		<div class="colophon-inner">
			<div class="colophon-cell">
				<span class="cell-rubric">DRAWN BY</span>
				<span class="cell-value">
					<a href="https://kemek.com">KEMEK NETWORK</a>
				</span>
			</div>
			<div class="colophon-cell">
				<span class="cell-rubric">PROCESS</span>
				<span class="cell-value">CLIENT-SIDE / NO UPLOAD</span>
			</div>
			<div class="colophon-cell">
				<span class="cell-rubric">EDITION</span>
				<span class="cell-value">v{__APP_VERSION__}</span>
			</div>
			<div class="colophon-cell colophon-cell-stamp">
				<span class="cell-rubric">TONE</span>
				<button
					class="tone-toggle"
					type="button"
					onclick={toggleTone}
					aria-label="Toggle color theme"
					aria-pressed={mode === 'dark'}
				>
					<span class="tone-seg" class:active={mode === 'light'}>DAY</span>
					<span class="tone-sep" aria-hidden="true">·</span>
					<span class="tone-seg" class:active={mode === 'dark'}>NIGHT</span>
				</button>
			</div>
		</div>
	</footer>
</div>

<style>
	.page-frame {
		position: relative;
		z-index: 2;
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr auto;
		/* Defense-in-depth: prevent any descendant from forcing the layout
		 * box wider than the viewport. min-width:0 keeps the implicit grid
		 * track from picking up content's min-content as a floor. */
		max-width: 100%;
		min-width: 0;
	}

	.skip-link {
		position: absolute;
		left: 0;
		top: 0;
		transform: translateY(-200%);
		background: var(--ink);
		color: var(--paper);
		padding: 0.6rem 1rem;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		z-index: 100;
		border: none;
		text-decoration: none;
		transition: transform var(--duration-fast) var(--ease);
	}
	.skip-link:focus {
		transform: translateY(0);
	}

	.masthead {
		border-bottom: 1px solid var(--rule);
		background: var(--paper);
		/* Honor iPhone safe-area inset on the top in landscape so the
		 * notch never overlaps the brand. No-op in portrait. */
		padding-top: env(safe-area-inset-top);
	}
	.masthead-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 1.1rem var(--gutter);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem 1rem;
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 22px;
		letter-spacing: -0.015em;
		border-bottom: none;
		font-variation-settings: 'opsz' 36;
	}
	.brand-mark {
		display: inline-block;
		width: 11px;
		height: 11px;
		background: var(--accent);
		transform: translateY(-1px) rotate(45deg);
	}
	.brand-name {
		font-feature-settings: 'ss01';
	}
	.brand-slash {
		color: var(--accent);
		margin: 0 0.06em;
		font-style: italic;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
		justify-content: center;
		max-width: 100%;
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		color: var(--ghost);
		border: 1px solid var(--rule);
		padding: 0.32rem 0.7rem 0.32rem 0.7rem;
		border-radius: 99px;
		letter-spacing: 0.16em;
		text-decoration: none;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease);
	}
	.pill:hover {
		color: var(--ink);
		border-color: var(--accent);
	}
	.pill:hover .pill-arrow {
		transform: translateX(2px);
	}
	.pill-dot {
		color: var(--accent);
	}
	.pill-arrow {
		color: var(--accent);
		margin-left: 0.4rem;
		transition: transform var(--duration-fast) var(--ease);
	}

	.type-nav {
		border-top: 1px solid var(--rule);
		background: var(--paper-warm);
		position: relative;
	}
	/* Edge fades that hint horizontal scroll on narrow viewports. The
	 * gradient sits on top of the scroll container as a non-interactive
	 * pseudo, hidden when the nav fits without overflow. */
	.type-nav::before,
	.type-nav::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1.6rem;
		pointer-events: none;
		z-index: 1;
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease);
	}
	.type-nav::before {
		left: 0;
		background: linear-gradient(to right, var(--paper-warm), rgba(237, 228, 206, 0));
	}
	.type-nav::after {
		right: 0;
		background: linear-gradient(to left, var(--paper-warm), rgba(237, 228, 206, 0));
	}
	@media (max-width: 720px) {
		.type-nav::before,
		.type-nav::after {
			opacity: 1;
		}
	}
	.type-nav-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 0 var(--gutter);
		display: flex;
		align-items: stretch;
		gap: 0;
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		scroll-snap-type: x proximity;
		scroll-padding-inline: var(--gutter);
	}
	.type-nav-inner::-webkit-scrollbar {
		display: none;
	}
	.type-nav-rubric {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--micro);
		padding: 0.7rem 1rem 0.7rem 0;
		border-right: 1px dashed var(--rule);
		margin-right: 0.5rem;
		flex: 0 0 auto;
		white-space: nowrap;
	}
	.type-link {
		flex: 1 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.18rem;
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 0.65rem 1rem 0.7rem;
		color: var(--ghost);
		border: none;
		border-bottom: 2px solid transparent;
		border-top: 2px solid transparent;
		text-decoration: none;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease),
			background var(--duration-fast) var(--ease);
		white-space: nowrap;
		scroll-snap-align: center;
		min-height: var(--touch);
		justify-content: center;
	}
	.plate-num {
		font-size: 8.5px;
		letter-spacing: 0.24em;
		color: var(--micro);
		font-feature-settings: 'tnum';
	}
	.plate-label {
		font-weight: 500;
	}
	.type-link:hover {
		color: var(--ink);
		background: var(--paper);
	}
	.type-link:hover .plate-num {
		color: var(--accent);
	}
	.type-link.active {
		color: var(--ink);
		border-bottom-color: var(--accent);
		background: var(--paper);
	}
	.type-link.active .plate-num {
		color: var(--accent);
	}
	@media (max-width: 720px) {
		.type-nav-rubric {
			display: none;
		}
		.type-link {
			padding: 0.7rem 0.85rem 0.75rem;
		}
		.type-nav-inner {
			padding: 0 calc(var(--gutter) * 0.8);
		}
	}
	/* At ≤480 px the horizontal-scroll plate-nav consistently read as
	 * "an item got cut off" rather than "scroll for more". Switch to a
	 * static 2 × 4 grid: every plate visible, no scroll affordance to
	 * misread. Keeps the engineering-spec lettering and the active
	 * underline; the PLATE INDEX rubric is already hidden at this
	 * size so the column structure stands on its own. */
	@media (max-width: 480px) {
		.type-nav::before,
		.type-nav::after {
			display: none;
		}
		.type-nav-inner {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			overflow-x: visible;
			padding: 0;
		}
		.type-link {
			padding: 0.6rem 0.3rem 0.65rem;
			gap: 0.1rem;
			border-right: 1px dashed var(--rule);
		}
		.type-link:nth-child(4n) {
			border-right: none;
		}
		/* Row 2 (links 5–8) gets a top dashed rule to separate it
		 * from row 1 — same dashed-rule language used for vertical
		 * separators on the row. */
		.type-link:nth-child(n + 5) {
			border-top: 1px dashed var(--rule);
		}
		.plate-num {
			font-size: 8px;
			letter-spacing: 0.2em;
		}
		.plate-label {
			font-size: 10px;
		}
	}

	.colophon {
		border-top: 1px solid var(--rule);
		background: var(--paper);
		padding-bottom: env(safe-area-inset-bottom);
	}
	.colophon-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		align-items: stretch;
	}
	.colophon-cell { min-width: 0; }
	.colophon-cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1.1rem 1.2rem;
		border-right: 1px solid var(--rule);
	}
	.colophon-cell:first-child {
		padding-left: var(--gutter);
	}
	.colophon-cell:last-child {
		border-right: none;
		padding-right: var(--gutter);
	}
	.colophon-cell-stamp {
		background: var(--paper-warm);
	}
	.cell-rubric {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--micro);
	}
	.cell-value {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		letter-spacing: 0.08em;
		color: var(--ink);
	}
	.cell-value a {
		color: var(--ink);
		border-bottom: none;
	}
	.cell-value a:hover {
		color: var(--accent);
	}

	/* TONE selector — replaces the decorative SHEET ∞/∞ stamp.
	 * Two-segment text toggle styled in the same monospace rubric
	 * language as the rest of the colophon, no button chrome. The
	 * inactive segment dims to --micro; the active one inherits
	 * --ink and gets an accent under-rule, mirroring the plate-nav
	 * active state. The dot separator stays accent-red so the
	 * toggle reads as a single composed element, not two. */
	.tone-toggle {
		display: inline-flex;
		align-items: baseline;
		gap: 0.45rem;
		padding: 0;
		margin: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		letter-spacing: 0.08em;
		color: var(--ink);
	}
	.tone-seg {
		color: var(--micro);
		padding-bottom: 1px;
		border-bottom: 1px solid transparent;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease);
	}
	.tone-seg.active {
		color: var(--ink);
		border-bottom-color: var(--accent);
	}
	.tone-toggle:hover .tone-seg:not(.active) {
		color: var(--ink);
	}
	.tone-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	.tone-sep {
		color: var(--accent);
	}

	@media (max-width: 720px) {
		.pill {
			font-size: 9px;
			letter-spacing: 0.12em;
			padding: 0.36rem 0.6rem;
		}
		.colophon-inner {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.colophon-cell {
			border-bottom: 1px solid var(--rule);
			padding: 0.95rem 1rem;
		}
		.colophon-cell:first-child {
			padding-left: var(--gutter);
		}
		.colophon-cell:last-child {
			padding-right: var(--gutter);
		}
		.colophon-cell:nth-child(2n) {
			border-right: none;
		}
		.colophon-cell:nth-last-child(-n + 2) {
			border-bottom: none;
		}
	}
	@media (max-width: 460px) {
		.brand {
			font-size: 19px;
		}
		.brand-mark {
			width: 9px;
			height: 9px;
		}
		.masthead-inner {
			padding: 0.95rem var(--gutter);
		}
		.pill .pill-arrow {
			display: none;
		}
		.pill {
			letter-spacing: 0.08em;
			padding: 0.32rem 0.55rem;
			gap: 0.25rem;
		}
		.colophon-inner {
			grid-template-columns: 1fr;
		}
		.colophon-cell {
			border-right: none;
			padding: 0.85rem var(--gutter);
		}
		.colophon-cell:last-child {
			border-bottom: none;
		}
		.colophon-cell:nth-last-child(-n + 2):not(:last-child) {
			border-bottom: 1px solid var(--rule);
		}
	}
</style>
