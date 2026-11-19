<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { CONTENT_TYPES, PLATE, ROUTE_FOR_TYPE, TYPE_LABELS } from '$lib/types';
	/* Vite `?url` imports resolve to the bundled, content-hashed asset
	 * paths at build time, so the preload tags below land on the
	 * exact filenames the @import-chain inside app.css will eventually
	 * request. Without this, the WOFF2 fetches sit behind 4 serial
	 * round-trips (HTML → main CSS → @fontsource CSS → WOFF2);
	 * preloading parallelizes the WOFF2 download against the CSS
	 * bundle. Three files cover every glyph rendered above the fold:
	 * Fraunces Variable for the hero title, JetBrains Mono 400 for
	 * body labels, JetBrains Mono 500 for the masthead pill + plate
	 * nav. Italic Fraunces is rendered via the variable normal
	 * axis's synthesized italic during preload — accurate enough
	 * for the few small italic surfaces (plate-large numerals,
	 * FAQ headings, brand-slash, current-plate-index entry). */
	import frauncesNormalUrl from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
	import mono400Url from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
	import mono500Url from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?url';

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
		/* Defense-in-depth: the FOUC script in app.html now sets
		 * data-theme unconditionally before first paint, so this
		 * matchMedia fallback only fires if that script silently
		 * failed (CSP violation, ancient browser without
		 * matchMedia, etc.). Returning the actual system preference
		 * here keeps the UI sane in those edge cases instead of
		 * defaulting to light unconditionally. */
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	let mode = $state<Mode>(readInitialMode());

	function applyTheme(next: Mode, persist = true) {
		mode = next;
		document.documentElement.setAttribute('data-theme', next);
		/* `persist=false` is used by the system-preference listener so a
		 * follow-the-OS change doesn't get written back to localStorage
		 * as an explicit override (which would lock the next page load
		 * to that theme even after the user changes their OS again). */
		if (!persist) return;
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

	/* Decorative footer counter, populated post-mount from
	 * /api/pageviews (KV-backed via Pages Function). Null until
	 * fetched OR if KV binding is absent / endpoint errors — the
	 * footer hides the Pageviews cell while null so users on
	 * pre-binding builds see no broken UI. */
	let pageviews = $state<number | null>(null);

	onMount(() => {
		/* If hydration finished on a different mode than the inline
		 * FOUC script applied (rare — only when matchMedia disagrees
		 * with the saved attribute), re-sync. */
		mode = readInitialMode();

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
				applyTheme(mq.matches ? 'dark' : 'light', false);
			}
		};
		mq.addEventListener('change', onSystemChange);

		/* Page-view counter — first-party fetch to our own Pages
		 * Function. Same-origin, no third-party. Silent fail; the
		 * footer cell is decorative, never a load-bearing UI bit. */
		fetch('/api/pageviews')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data && typeof data.count === 'number') pageviews = data.count;
			})
			.catch(() => {
				/* swallow — decorative, never block */
			});

		return () => mq.removeEventListener('change', onSystemChange);
	});

	/* The plate the current route draws, or null off the generator
	 * (/about, the 404) — the nav must not mark URL as the current page
	 * on a page that isn't one. */
	const activeType = $derived(
		CONTENT_TYPES.find((t) => ROUTE_FOR_TYPE[t] === page.route.id) ?? null
	);

	/* The colophon-link sits at the bottom of every page; SvelteKit's
	 * default scroll-restoration sometimes lands /about at a stale
	 * y-position (a previous bottom-of-page scroll, or the click
	 * y-coord). Force top-of-page on this specific CTA. Modifier
	 * clicks fall through to native behavior so cmd/middle-click
	 * still open in a new tab. */
	async function navigateToColophon(e: MouseEvent) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
		e.preventDefault();
		await goto('/about');
		window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
	}
</script>

<svelte:head>
	<!-- Critical font preloads — parallelize WOFF2 fetches against the
	     CSS bundle. See script-top comment for rationale. `crossorigin=""`
	     (equivalent to `crossorigin="anonymous"`) is required by the
	     HTML spec for `<link rel="preload" as="font">` regardless of
	     origin; Svelte/TS reject the boolean shorthand. -->
	<link rel="preload" href={frauncesNormalUrl} as="font" type="font/woff2" crossorigin="" />
	<link rel="preload" href={mono500Url} as="font" type="font/woff2" crossorigin="" />
	<link rel="preload" href={mono400Url} as="font" type="font/woff2" crossorigin="" />

	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

	<!-- Identity / publisher. kVadrum is the creative author
	     (rel="author", rel="me", DC.creator); KeMeK Network is the
	     publisher / legal entity holding the copyright + all
	     rights in the wordmark + logo (rel="publisher", DC.publisher,
	     DC.rights). The Schema.org Organization JSON-LD at the
	     bottom of this head spells out the same relationship in
	     a machine-graph-friendly form. -->
	<meta name="application-name" content="kemek/qr" />
	<meta name="author" content="kVadrum" />
	<meta name="publisher" content="KeMeK Network" />
	<meta name="copyright" content="KeMeK Network © 2026" />
	<meta name="generator" content="SvelteKit" />
	<link rel="author" href="https://kvadrum.com" />
	<link rel="publisher" href="https://kemek.com" />
	<!-- rel="me" claims the author identity for Mastodon /
	     indieweb verification chains. Mutual rel="me" with
	     kvadrum.com establishes the link. -->
	<link rel="me" href="https://kvadrum.com" />

	<!-- Dublin Core — consumed by academic, archival, and
	     library-grade crawlers. Mirrors the meta + JSON-LD identity
	     in the format those crawlers expect. -->
	<meta name="DC.title" content="kemek/qr" />
	<meta name="DC.creator" content="kVadrum" />
	<meta name="DC.publisher" content="KeMeK Network" />
	<meta name="DC.rights" content="KeMeK Network © 2026" />
	<meta name="DC.identifier" content="https://qr.kemek.com" />
	<meta name="DC.language" content="en" />
	<meta name="DC.type" content="InteractiveResource" />

	<!-- Crawlers: index aggressively, allow large image previews so the
	     OG card surfaces in Google rich results. -->
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
	<link rel="sitemap" type="application/xml" href="/sitemap.xml" />

	<!-- Privacy posture: don't leak referrer to outbound links. Matches
	     the no-tracking ethos of the tool itself. -->
	<meta name="referrer" content="no-referrer-when-downgrade" />

	<!-- Stop Safari from auto-linking phone-shaped strings inside the
	     app surface (WiFi passwords, vCard numbers, geo coords). -->
	<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />

	<!-- Icons. Modern browsers prefer SVG for theme/dpi-independent
	     rendering; legacy browsers and platforms (iOS home screen,
	     Windows pinned tiles, RSS readers) fall through to the rasters. -->
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
	<link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
	<link rel="manifest" href="/site.webmanifest" />

	<!-- Theme-color: matches the page surface so the mobile address bar
	     and PWA chrome blend with the paper/graphite. The accent red
	     stays in the manifest's theme_color (PWA splash screen) — bold
	     identity moment for install, calm chrome for browsing. -->
	<meta name="theme-color" content="#f2ebdd" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#16140f" media="(prefers-color-scheme: dark)" />
	<meta name="msapplication-TileColor" content="#c53a1f" />

	<!-- iOS / Android PWA install hints -->
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content="kemek/qr" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

	<!-- OG image: a 1200×630 card rendered at 2× (2400×1260).
	     og:site_name lives here only. Per-page og:title /
	     og:description / og:url / og:type live in the page's own
	     svelte:head. -->
	<meta property="og:site_name" content="kemek/qr" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:image" content="https://qr.kemek.com/og.png" />
	<meta property="og:image:secure_url" content="https://qr.kemek.com/og.png" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="2400" />
	<meta property="og:image:height" content="1260" />
	<meta
		property="og:image:alt"
		content="kemek/qr — a free, browser-only QR code generator from KeMeK Network. Drafting-spec card with corner crop marks and dimensional metadata."
	/>

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://qr.kemek.com/og.png" />
	<meta
		name="twitter:image:alt"
		content="kemek/qr — a free, browser-only QR code generator from KeMeK Network."
	/>

	<!-- Schema.org Organization for KeMeK Network — establishes the
	     publisher entity for Google's brand panel. Per-page
	     WebApplication / AboutPage JSON-LD lives on each route. -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'KeMeK Network',
		url: 'https://kemek.com',
		logo: 'https://qr.kemek.com/favicon-512.png',
		brand: { '@type': 'Brand', name: 'kemek/qr' },
		founder: {
			'@type': 'Person',
			name: 'kVadrum',
			url: 'https://kvadrum.com'
		}
	})}</script>`}
</svelte:head>

<div class="page-frame">
	<a href="#main" class="skip-link">Skip to generator</a>
	<header class="masthead">
		<div class="masthead-inner">
			<a class="brand" href="/">
				<span class="brand-mark" aria-hidden="true">
					<svg viewBox="0 0 7 7" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
						<!-- TL finder pattern: 3×3 hollow square -->
						<path d="M0 0h3v1H0zM0 2h3v1H0zM0 1h1v1H0zM2 1h1v1H2z" />
						<!-- TR finder pattern -->
						<path d="M4 0h3v1H4zM4 2h3v1H4zM4 1h1v1H4zM6 1h1v1H6z" />
						<!-- BL finder pattern -->
						<path d="M0 4h3v1H0zM0 6h3v1H0zM0 5h1v1H0zM2 5h1v1H2z" />
						<!-- Data cells in BR quadrant — read as QR "modules" -->
						<rect x="4" y="4" width="1" height="1" />
						<rect x="6" y="4" width="1" height="1" />
						<rect x="5" y="5" width="1" height="1" />
						<rect x="4" y="6" width="1" height="1" />
						<rect x="6" y="6" width="1" height="1" />
					</svg>
				</span>
				<span class="brand-name">kemek<span class="brand-slash">/</span>qr</span>
			</a>
			<a class="pill" href="/about" aria-label="NO SIGNUP NO TRACKING NO UPLOAD — about page">
				NO SIGNUP <span class="pill-dot" aria-hidden="true">·</span> NO TRACKING
				<span class="pill-dot" aria-hidden="true">·</span> NO UPLOAD
				<span class="pill-arrow" aria-hidden="true">→</span>
			</a>
			<button
				class="theme-toggle"
				class:is-dark={mode === 'dark'}
				type="button"
				onclick={toggleTone}
				aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
				aria-pressed={mode === 'dark'}
				title={mode === 'dark' ? 'Switch to day' : 'Switch to night'}
			>
				<span class="theme-toggle-icons" aria-hidden="true">
					<!-- Sun: outlined limb + 8 rays (4 cardinal + 4 intercardinal),
					     read as a celestial drafting mark. -->
					<svg
						class="icon-sun"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="4" />
						<line x1="12" y1="2.5" x2="12" y2="4.5" />
						<line x1="12" y1="19.5" x2="12" y2="21.5" />
						<line x1="2.5" y1="12" x2="4.5" y2="12" />
						<line x1="19.5" y1="12" x2="21.5" y2="12" />
						<line x1="5.22" y1="5.22" x2="6.64" y2="6.64" />
						<line x1="17.36" y1="17.36" x2="18.78" y2="18.78" />
						<line x1="5.22" y1="18.78" x2="6.64" y2="17.36" />
						<line x1="17.36" y1="6.64" x2="18.78" y2="5.22" />
					</svg>
					<!-- Moon: closed crescent — outline-only to match the sun's
					     stroke language; reads as a single architectural sweep. -->
					<svg
						class="icon-moon"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				</span>
			</button>
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

	{#if page.url.pathname !== '/about'}
		<a class="colophon-link" href="/about" onclick={navigateToColophon}>
			<span class="cl-tick cl-tick-tl" aria-hidden="true"></span>
			<span class="cl-tick cl-tick-tr" aria-hidden="true"></span>
			<span class="cl-tick cl-tick-bl" aria-hidden="true"></span>
			<span class="cl-tick cl-tick-br" aria-hidden="true"></span>
			<div class="cl-inner">
				<div class="cl-marker">
					<span class="cl-marker-num" aria-hidden="true">§00</span>
					<span class="cl-marker-rubric">Colophon</span>
				</div>
				<div class="cl-headline">
					<h2 class="cl-title">About the specification</h2>
					<p class="cl-sub">Privacy · Method · License · Error&nbsp;correction · Brand</p>
				</div>
				<div class="cl-cta">
					<span class="cl-cta-rubric">On file</span>
					<span class="cl-cta-arrow" aria-hidden="true">→</span>
				</div>
			</div>
		</a>
	{/if}

	<footer class="colophon">
		<div class="colophon-inner">
			<div class="colophon-cell">
				<span class="cell-rubric">DRAWN BY</span>
				<span class="cell-value">
					<a href="https://kvadrum.com" target="_blank" rel="author noopener">kVadrum</a>
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
					aria-label="DAY NIGHT — color theme toggle"
					aria-pressed={mode === 'dark'}
				>
					<span class="tone-seg" class:active={mode === 'light'}>DAY</span>
					<span class="tone-sep" aria-hidden="true">·</span>
					<span class="tone-seg" class:active={mode === 'dark'}>NIGHT</span>
				</button>
			</div>
		</div>
		<div class="colophon-rights-wrap">
			<p class="colophon-rights">
				<span class="rights-item"
					><a href="https://kemek.com" target="_blank" rel="publisher noopener">KEMEK NETWORK</a> ©
					<span class="rights-year">MMXXVI</span></span
				>
				·
				<span class="rights-item"
					>License: <a
						href="https://github.com/kemeknetwork/kemek-QR/blob/main/LICENSE"
						target="_blank"
						rel="license noopener">MIT</a
					></span
				>
				{#if pageviews !== null}
					·
					<span class="rights-item"
						>Pageviews: <span class="pageviews-count">{pageviews.toLocaleString()}</span></span
					>
				{/if}
			</p>
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
		/* No descendant may make the page wider than the viewport. The
		 * frame's own min/max-width bound only its box: an implicit
		 * column is `auto`, which grows to the widest row's min-content
		 * and overflows the frame (html clips it). The masthead's
		 * 4 × 2 type nav (`.type-nav`) did that at a 320 px window with a
		 * classic scrollbar: a 319 px column in a 305 px frame laid the masthead
		 * and the generator out 14 px too wide, their right edge clipped.
		 * minmax(0, 1fr) caps the column at the frame. */
		grid-template-columns: minmax(0, 1fr);
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
		font-size: 13px;
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
		gap: 0.55rem;
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 31px;
		letter-spacing: -0.015em;
		border-bottom: none;
		font-variation-settings: 'opsz' 36;
		/* Push pill + toggle to the right edge of the masthead. */
		margin-right: auto;
	}
	.brand-mark {
		display: inline-flex;
		width: 30px;
		height: 30px;
		color: var(--accent);
		flex: 0 0 auto;
		/* Tiny vertical lift so the QR mark's optical center sits on
		 * the typographic baseline of "kemek/qr" instead of below it. */
		transform: translateY(-1px);
	}
	.brand-mark svg {
		display: block;
		width: 100%;
		height: 100%;
		shape-rendering: crispEdges;
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
		gap: 0.28rem;
		flex-wrap: nowrap;
		white-space: nowrap;
		max-width: 100%;
		font-family: var(--font-mono);
		font-size: 11.55px;
		text-transform: uppercase;
		color: var(--ghost);
		border: 1px solid var(--rule);
		padding: 0.36rem 0.6rem;
		border-radius: 99px;
		letter-spacing: 0.11em;
		text-decoration: none;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease);
	}

	/* Theme toggle — circular satellite to the pill, sized to match
	 * its overall height. The two icons stack absolutely inside a
	 * fixed 18px square; the inactive one fades + spins out, the
	 * active one fades + spins in. Crossfade is short enough to
	 * feel like a flip, not a transition. */
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 37px;
		height: 37px;
		padding: 0;
		margin: 0;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 99px;
		color: var(--ghost);
		cursor: pointer;
		flex: 0 0 auto;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease),
			background var(--duration-fast) var(--ease);
	}
	.theme-toggle:hover {
		color: var(--ink);
		border-color: var(--accent);
	}
	.theme-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.theme-toggle-icons {
		position: relative;
		display: block;
		width: 21px;
		height: 21px;
	}
	.theme-toggle-icons svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform-origin: center;
		transition:
			opacity 220ms var(--ease),
			transform 320ms var(--ease);
	}
	/* Light mode — sun visible, moon waiting */
	.theme-toggle .icon-sun {
		opacity: 1;
		transform: rotate(0deg) scale(1);
	}
	.theme-toggle .icon-moon {
		opacity: 0;
		transform: rotate(-65deg) scale(0.6);
	}
	/* Dark mode — moon visible, sun parked */
	.theme-toggle.is-dark .icon-sun {
		opacity: 0;
		transform: rotate(65deg) scale(0.6);
	}
	.theme-toggle.is-dark .icon-moon {
		opacity: 1;
		transform: rotate(0deg) scale(1);
	}
	@media (prefers-reduced-motion: reduce) {
		.theme-toggle-icons svg {
			transition-duration: 0ms;
		}
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
		margin-left: 0.3rem;
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
		background: linear-gradient(to right, var(--paper-warm), transparent);
	}
	.type-nav::after {
		right: 0;
		background: linear-gradient(to left, var(--paper-warm), transparent);
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
		font-size: 13px;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--micro);
		padding: 0.9rem 1.1rem 0.9rem 0;
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
		gap: 0.22rem;
		font-family: var(--font-mono);
		font-size: 21px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 1rem 1.1rem 1.05rem;
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
		font-size: 13px;
		letter-spacing: 0.22em;
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
	/* Below 1100 px the 8 type-links + PLATE INDEX rubric no longer
	 * fit a single horizontal row at the post-bump 20 px label size.
	 * Switching to a 4 × 2 grid here (instead of at the previous
	 * ≤480 px breakpoint) keeps every plate visible at laptop and
	 * tablet widths instead of pushing PL.06–08 off-screen behind
	 * a scroll affordance the user is unlikely to discover. */
	@media (max-width: 1100px) {
		.type-nav::before,
		.type-nav::after {
			display: none;
		}
		.type-nav-rubric {
			display: none;
		}
		.type-nav-inner {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			overflow-x: visible;
			padding: 0;
		}
		.type-link {
			border-right: 1px dashed var(--rule);
		}
		/* `:nth-of-type` (not `:nth-child`) counts only the <a> links,
		 * skipping the .type-nav-rubric <span> sibling — otherwise the
		 * end-of-row math is off by one and WIFI loses its right border
		 * instead of VCARD (and PHONE instead of GEO). */
		.type-link:nth-of-type(4n) {
			border-right: none;
		}
		.type-link:nth-of-type(n + 5) {
			border-top: 1px dashed var(--rule);
		}
	}
	@media (max-width: 720px) {
		.type-link {
			padding: 0.9rem 0.6rem 0.95rem;
			font-size: 19px;
			letter-spacing: 0.12em;
		}
	}
	@media (max-width: 480px) {
		.type-link {
			padding: 0.85rem 0.35rem 0.9rem;
			gap: 0.18rem;
		}
		.plate-num {
			font-size: 12px;
			letter-spacing: 0.18em;
		}
		.plate-label {
			font-size: 18px;
		}
	}

	/* Full-width "colophon stamp" — gateway band between main content
	 * and the cream four-cell colophon below. Paper-warm fill (quiet
	 * differentiation from the main page paper) bracketed by dashed
	 * full-width rules above and below for clear section-break read.
	 * Accent red is restricted to corner ticks + the §00 marker
	 * number + the CTA arrow — small punctuation marks on a quiet
	 * field, not a flood of color. Three-column grid at desktop
	 * (marker · headline · CTA), stacked centered at mobile.
	 * Hidden on /about itself via the template guard, not CSS. */
	.colophon-link {
		display: block;
		position: relative;
		width: 100%;
		background: var(--paper-warm);
		color: var(--ink);
		border-top: 1px dashed var(--rule);
		border-bottom: 1px dashed var(--rule);
		overflow: hidden;
		text-decoration: none;
		transition:
			background var(--duration-fast) var(--ease),
			color var(--duration-fast) var(--ease);
	}
	.colophon-link:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -8px;
	}

	/* Corner ticks — accent red, small drafting-spec frame marks at
	 * the four corners of the band. Anchored to a padded offset from
	 * each viewport edge (not flush) so they read as deliberate. */
	.cl-tick {
		position: absolute;
		width: 14px;
		height: 14px;
		pointer-events: none;
		color: var(--accent);
	}
	.cl-tick-tl {
		top: 14px;
		left: clamp(14px, var(--gutter), 32px);
		border-top: 1.5px solid currentColor;
		border-left: 1.5px solid currentColor;
	}
	.cl-tick-tr {
		top: 14px;
		right: clamp(14px, var(--gutter), 32px);
		border-top: 1.5px solid currentColor;
		border-right: 1.5px solid currentColor;
	}
	.cl-tick-bl {
		bottom: 14px;
		left: clamp(14px, var(--gutter), 32px);
		border-bottom: 1.5px solid currentColor;
		border-left: 1.5px solid currentColor;
	}
	.cl-tick-br {
		bottom: 14px;
		right: clamp(14px, var(--gutter), 32px);
		border-bottom: 1.5px solid currentColor;
		border-right: 1.5px solid currentColor;
	}

	.cl-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2.5rem, 5vw, 3.5rem) var(--gutter);
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: clamp(1.5rem, 4vw, 3rem);
		align-items: center;
	}

	.cl-marker {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		line-height: 1;
	}
	.cl-marker-num {
		font-family: var(--font-mono);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--accent-text);
	}
	.cl-marker-rubric {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--micro);
	}

	.cl-headline {
		text-align: center;
		min-width: 0;
	}
	.cl-title {
		font-family: var(--font-display);
		font-size: clamp(26px, 4.2vw, 42px);
		font-weight: 500;
		letter-spacing: -0.012em;
		line-height: 1.04;
		margin: 0;
		color: var(--ink);
		transition: color var(--duration-fast) var(--ease);
	}
	.cl-sub {
		margin: 0.6rem 0 0;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--micro);
	}

	.cl-cta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.35rem;
		line-height: 1;
	}
	.cl-cta-rubric {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--micro);
	}
	.cl-cta-arrow {
		font-family: var(--font-mono);
		font-size: 32px;
		line-height: 1;
		color: var(--accent);
		transition: transform var(--duration-fast) var(--ease);
	}
	.colophon-link:hover .cl-title,
	.colophon-link:focus-visible .cl-title {
		color: var(--accent);
	}
	.colophon-link:hover .cl-cta-arrow,
	.colophon-link:focus-visible .cl-cta-arrow {
		transform: translateX(8px);
	}

	@media (max-width: 720px) {
		.cl-inner {
			grid-template-columns: 1fr;
			gap: 1.2rem;
			text-align: center;
			padding: clamp(2rem, 6vw, 2.5rem) var(--gutter);
		}
		.cl-marker {
			flex-direction: row;
			align-items: center;
			justify-content: center;
			gap: 0.6rem;
		}
		.cl-cta {
			flex-direction: row;
			align-items: center;
			justify-content: center;
			gap: 0.7rem;
		}
		.cl-cta-arrow {
			font-size: 26px;
		}
		.cl-tick {
			width: 10px;
			height: 10px;
		}
	}
	@media (max-width: 480px) {
		.cl-title {
			font-size: 22px;
		}
		.cl-sub {
			font-size: 11px;
			letter-spacing: 0.14em;
		}
	}

	.colophon {
		border-top: 1px solid var(--rule);
		background: var(--paper);
	}
	.colophon-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		align-items: stretch;
	}
	.colophon-cell {
		min-width: 0;
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
		font-size: 14px;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--micro);
	}
	.cell-value {
		font-family: var(--font-mono);
		font-size: 14.44px;
		letter-spacing: 0.07em;
		color: var(--ink);
	}
	.cell-value a {
		color: var(--ink);
		border-bottom: none;
	}
	.cell-value a:hover {
		color: var(--accent);
	}

	/* Sub-bar beneath the four-cell colophon: legal copyright + license
	 * + publisher link. Roman-numeral year keeps the drafting-spec
	 * voice; the actual <copyright> meta tag is the legal anchor.
	 * The dashed rule above lives on .colophon-rights-wrap so it
	 * reaches the viewport edges, not just the --max-w container. */
	.colophon-rights-wrap {
		width: 100%;
		border-top: 1px dashed var(--rule);
	}
	.colophon-rights {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 0.7rem var(--gutter) calc(0.85rem + env(safe-area-inset-bottom));
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--micro);
		text-align: center;
	}
	.colophon-rights a {
		color: var(--micro);
		border-bottom: 1px solid var(--rule);
	}
	.colophon-rights a:hover {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	/* Each "·"-separated clause wraps as a unit, so a narrow screen
	 * breaks the line between clauses, never inside one. */
	.rights-item {
		white-space: nowrap;
	}
	.rights-year {
		font-feature-settings: 'tnum';
	}
	/* Digit treatment for the pageviews counter. Tabular figures so
	 * the number doesn't reflow when the count rolls past a digit
	 * boundary; accent-red to subtly differentiate from the static
	 * copyright/license tokens. */
	.pageviews-count {
		font-feature-settings: 'tnum';
		color: var(--accent);
		letter-spacing: 0.18em;
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
		font-size: 14.44px;
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
	@media (max-width: 480px) {
		/* Two-row masthead at phone-portrait widths: brand + theme
		 * toggle on row 1 (toggle right-aligned), pill alone on row 2.
		 * The flat masthead-inner becomes a 2-col grid; the pill spans
		 * both columns and centers itself. With its own row the pill
		 * has room to grow — text bumps ~30 % so it reads as a real
		 * privacy banner instead of the cramped tag-along it was. */
		.masthead-inner {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'brand toggle'
				'pill  pill';
			column-gap: 0.6rem;
			row-gap: 0.6rem;
			padding: 0.95rem var(--gutter);
		}
		.brand {
			grid-area: brand;
			margin-right: 0;
			font-size: 26px;
		}
		.brand-mark {
			width: 24px;
			height: 24px;
		}
		.theme-toggle {
			grid-area: toggle;
			justify-self: end;
		}
		/* The pill never wraps, so its type scales with the viewport
		 * (~23.5 px of row per px of font-size, plus gutters, padding
		 * and border) and caps at 15.4 px. A fixed 15.4 px only fits a
		 * ~430 px screen; narrower phones clip "NO UPLOAD" and the arrow. */
		.pill {
			grid-area: pill;
			justify-self: center;
			font-size: min(15.4px, calc((100vw - 74px) / 23.5));
			letter-spacing: 0.08em;
			padding: 0.5rem 0.94rem;
			gap: 0.35rem;
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
