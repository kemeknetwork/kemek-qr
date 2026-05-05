<script lang="ts">
	const SITE = 'https://qr.kemek.com';
	const canonicalUrl = `${SITE}/about`;
	const title = 'About kemek/qr — privacy posture, scope, license | KeMeK';
	const description =
		'How kemek/qr is built and why. A free, fully client-side QR generator from KeMeK Network — no signup, no upload, MIT-licensed source.';

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'AboutPage',
		name: 'About kemek/qr',
		description,
		url: canonicalUrl,
		isPartOf: {
			'@type': 'WebApplication',
			name: 'kemek/qr',
			url: SITE
		},
		creator: {
			'@type': 'Organization',
			name: 'KeMeK Network',
			url: 'https://kemek.com'
		}
	};
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:site_name" content="KeMeK QR" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<section class="hero" aria-label="Title block">
	<div class="title-block">
		<div class="title-block-corner title-block-tl">
			<span class="rubric">SHEET</span>
			<span class="value plate-large">∞</span>
		</div>
		<div class="title-block-corner title-block-tr">
			<span class="rubric">SCALE</span>
			<span class="value">N · T · S</span>
		</div>
		<div class="title-block-corner title-block-bl">
			<span class="rubric">EDITION</span>
			<span class="value">v{__APP_VERSION__}</span>
		</div>
		<div class="title-block-corner title-block-br">
			<span class="rubric">FILE</span>
			<span class="value">KMK·QR·ABOUT</span>
		</div>

		<div class="title-block-body">
			<span class="title-rubric">COLOPHON · ABOUT THIS SPECIFICATION</span>
			<h1 class="hero-title">A QR generator that doesn’t want anything from you.</h1>
			<p class="hero-sub">
				kemek/qr is a free utility from KeMeK Network. It runs entirely in your
				browser — no upload, no account, no expiry, no tracking. This page
				explains exactly what that means and where the limits are.
			</p>
		</div>
	</div>
</section>

<section class="explainer">
	<header class="section-head">
		<span class="section-marker">§01</span>
		<h2 class="section-title">What kemek/qr is</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			A static-page web app for generating QR codes. You pick a content type
			(URL, plain text, WiFi credentials, vCard contact, mailto:, SMS, tel:,
			geo:), tune the styling, and download a print-ready PNG, SVG, or PDF.
			The generator and every export run in your browser — there is no
			backend involved at any step.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			"Static" here means the QR encodes its destination directly. There is
			no shortener, no redirect server, nothing tracking the scan. A static
			URL QR works for as long as the URL itself works; a static WiFi QR
			works as long as the network credentials match. None of these can be
			edited after the fact — to change the destination you regenerate the
			QR.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			The generator is a single SvelteKit app, prerendered to static HTML
			and bundled JavaScript. Cloudflare Pages serves the artifact;
			Cloudflare touches no request payloads beyond standard CDN logging.
		</p>
	</div>

	<header class="section-head">
		<span class="section-marker">§02</span>
		<h2 class="section-title">What we don’t do</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			<strong>No analytics on the generator pages.</strong> No Google
			Analytics, no Plausible, no Umami, no Cloudflare Web Analytics. The
			tool itself is observed only by Cloudflare’s standard request logs at
			the edge, which we don’t aggregate.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			<strong>No third-party assets.</strong> Fonts (Fraunces and JetBrains
			Mono) are bundled locally via npm packages, not loaded from Google
			Fonts. There is no CDN-hosted JavaScript, no embed scripts, no
			tracking pixels.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			<strong>No signup, no account, no email gate.</strong> Every feature is
			free at the same point: open the page, generate the code, download.
			Permalinks (the COPY LINK button on each generator) encode every
			setting into the URL hash so you can share or bookmark a configured
			QR without an account.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">04</span>
			<strong>No dynamic QRs, no scan analytics.</strong> Editable
			destinations and per-scan analytics require a server-side redirect,
			which would mean accounts, hosted endpoints, and tracking by
			construction. That is a different product. If you need it, choose a
			SaaS QR provider — there are many.
		</p>
	</div>

	<header class="section-head">
		<span class="section-marker">§03</span>
		<h2 class="section-title">How your data flows</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			Anything you type into a form (URL, WiFi password, contact name,
			etc.) stays in the browser tab. It is not sent over the wire. The QR
			image is rendered locally by a JavaScript library
			(<a href="https://github.com/kozakdenys/qr-code-styling">qr-code-styling</a>)
			and the file you download comes out of the same tab.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			If you upload a logo to embed in the QR, the file is read with the
			browser’s built-in <code>FileReader</code>, kept in memory, and
			composited into the output. It is never uploaded anywhere.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			Your last inputs persist between sessions via{' '}
			<code>localStorage</code> on the same device — also local, also
			under your control. Clearing site data clears the saved session.
			Loading a permalink (a URL with a <code>#s=…</code> hash) overrides
			the saved session for that visit.
		</p>
	</div>

	<header class="section-head">
		<span class="section-marker">§04</span>
		<h2 class="section-title">License &amp; source</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			The kemek/qr source is{' '}
			<a href="https://github.com/KeMeK-Network/kemek-QR">on GitHub</a>{' '}
			under the MIT license. Read the code, fork it, run your own copy if
			you’d rather not trust ours. The privacy claims on this page reduce
			to "we ship no telemetry code"; the source is the proof.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			kemek/qr is part of the{' '}
			<a href="https://kemek.com">KeMeK Network</a> family of free
			utilities. KeMeK Network builds tools that don’t ask anything of the
			user; this one extends that posture to the public web.
		</p>
	</div>

	<header class="section-head">
		<span class="section-marker">§05</span>
		<h2 class="section-title">Plate index</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<ol class="plate-index">
		<li><a href="/"><span class="plate-index-num">PL.01</span><span class="plate-index-body"><span class="plate-index-label">URL</span><span class="plate-index-h1">URL QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/text"><span class="plate-index-num">PL.02</span><span class="plate-index-body"><span class="plate-index-label">TEXT</span><span class="plate-index-h1">Text QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/wifi"><span class="plate-index-num">PL.03</span><span class="plate-index-body"><span class="plate-index-label">WIFI</span><span class="plate-index-h1">WiFi QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/vcard"><span class="plate-index-num">PL.04</span><span class="plate-index-body"><span class="plate-index-label">VCARD</span><span class="plate-index-h1">vCard QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/email"><span class="plate-index-num">PL.05</span><span class="plate-index-body"><span class="plate-index-label">EMAIL</span><span class="plate-index-h1">Email QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/sms"><span class="plate-index-num">PL.06</span><span class="plate-index-body"><span class="plate-index-label">SMS</span><span class="plate-index-h1">SMS QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/phone"><span class="plate-index-num">PL.07</span><span class="plate-index-body"><span class="plate-index-label">PHONE</span><span class="plate-index-h1">Phone QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
		<li><a href="/geo"><span class="plate-index-num">PL.08</span><span class="plate-index-body"><span class="plate-index-label">GEO</span><span class="plate-index-h1">Geo location QR generator</span></span><span class="plate-index-arrow" aria-hidden="true">→</span></a></li>
	</ol>
</section>

<style>
	/* Reuses the title-block + section + prose + plate-index styles
	 * from LandingPage.svelte by copy — Svelte's scoped styles don't
	 * cross component boundaries, so duplication beats a brittle
	 * :global() shared sheet. Style additions here are limited to
	 * what's already in LandingPage; if those drift, drift this too. */
	.hero {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2.5rem, 6vw, 4rem) var(--gutter) clamp(1.5rem, 4vw, 2.5rem);
		animation: fade-up var(--duration-slow) var(--ease) both;
	}
	.title-block {
		position: relative;
		border: 1px solid var(--rule-strong);
		background: var(--paper);
		padding: clamp(1.25rem, 4vw, 2rem);
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-template-rows: auto 1fr auto;
	}
	.title-block-corner { min-width: 0; }
	.title-block::before,
	.title-block::after {
		content: '';
		position: absolute;
		pointer-events: none;
		color: var(--accent);
	}
	.title-block::before {
		inset: -1px auto auto -1px;
		width: 14px;
		height: 14px;
		border-top: 2px solid currentColor;
		border-left: 2px solid currentColor;
	}
	.title-block::after {
		inset: auto -1px -1px auto;
		width: 14px;
		height: 14px;
		border-bottom: 2px solid currentColor;
		border-right: 2px solid currentColor;
	}
	.title-block-corner {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-family: var(--font-mono);
		padding: 0 0.5rem;
	}
	.title-block-tl { justify-self: start; grid-row: 1; grid-column: 1; padding-left: 0; }
	.title-block-tr { justify-self: end; text-align: right; grid-row: 1; grid-column: 2; padding-right: 0; }
	.title-block-bl { justify-self: start; grid-row: 3; grid-column: 1; padding-left: 0; }
	.title-block-br { justify-self: end; text-align: right; grid-row: 3; grid-column: 2; padding-right: 0; }
	.title-block-corner .rubric {
		font-size: 11px;
		letter-spacing: 0.32em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.title-block-corner .value {
		font-size: 13px;
		letter-spacing: 0.14em;
		color: var(--ink);
		text-transform: uppercase;
		font-feature-settings: 'tnum';
	}
	.plate-large {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 3.5vw, 2.4rem);
		font-weight: 400;
		font-style: italic;
		color: var(--accent);
		letter-spacing: -0.02em;
		font-variation-settings: 'opsz' 36;
		line-height: 1;
		margin-top: 0.1rem;
	}
	@media (max-width: 540px) {
		.title-block-corner .rubric { font-size: 10px; letter-spacing: 0.26em; }
		.title-block-corner .value { font-size: 12px; letter-spacing: 0.1em; }
		.plate-large { font-size: clamp(1.25rem, 6vw, 1.75rem); margin-top: 0.05rem; }
	}
	@media (max-width: 380px) {
		.title-block-corner .value:not(.plate-large) { font-size: 11px; letter-spacing: 0.04em; }
	}

	.title-block-body {
		grid-row: 2;
		grid-column: 1 / -1;
		padding: clamp(1.4rem, 4vw, 2.5rem) clamp(0.25rem, 2vw, 2rem);
		text-align: center;
		position: relative;
	}
	.title-block-body::before,
	.title-block-body::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--rule);
	}
	.title-block-body::before { top: 0; }
	.title-block-body::after { bottom: 0; }

	.title-rubric {
		display: inline-block;
		max-width: 100%;
		font-family: var(--font-mono);
		font-size: 12.5px;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 1.1rem;
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--accent);
		overflow-wrap: anywhere;
	}
	.hero-title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(1.7rem, 5vw + 0.5rem, 3.75rem);
		line-height: 1.06;
		letter-spacing: -0.025em;
		margin: 0 auto 1.2rem;
		color: var(--ink);
		max-width: 22ch;
		font-variation-settings: 'opsz' 144;
		text-wrap: balance;
		overflow-wrap: anywhere;
	}
	@media (max-width: 540px) {
		.title-rubric { font-size: 11px; letter-spacing: 0.24em; padding: 0.3rem 0.55rem; margin-bottom: 0.85rem; }
	}
	@media (max-width: 380px) {
		.title-rubric { font-size: 10px; letter-spacing: 0.18em; padding: 0.28rem 0.45rem; }
	}
	.hero-sub {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		color: var(--ghost);
		margin: 0 auto 1.5rem;
		max-width: 60ch;
		line-height: 1.65;
		letter-spacing: 0.01em;
	}

	.explainer {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.5rem) var(--gutter) clamp(3rem, 6vw, 5rem);
		animation: fade-up var(--duration-slow) var(--ease) 360ms both;
	}
	.section-head {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr);
		align-items: baseline;
		gap: 0.8rem;
		margin: clamp(2.2rem, 4vw, 3.2rem) 0 1.2rem;
	}
	.section-marker {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.18em;
		color: var(--accent);
		font-feature-settings: 'tnum';
	}
	.section-title {
		font-family: var(--font-mono);
		font-weight: 500;
		font-size: var(--fs-xs);
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ghost);
		margin: 0;
	}
	.section-rule {
		display: block;
		border-bottom: 1px dashed var(--rule);
		align-self: center;
		margin-top: -2px;
	}

	.prose {
		max-width: 68ch;
	}
	.prose p {
		font-family: var(--font-display);
		font-size: var(--fs-base);
		line-height: 1.7;
		color: var(--ink-soft);
		margin: 0 0 1.1rem;
		font-variation-settings: 'opsz' 14;
		position: relative;
		padding-left: 3rem;
	}
	.prose p strong {
		color: var(--ink);
	}
	.prose p code {
		font-family: var(--font-mono);
		font-size: 0.88em;
		background: var(--paper-warm);
		padding: 0.05em 0.35em;
		border-radius: 2px;
	}
	.dropmark {
		position: absolute;
		left: 0;
		top: 0.55em;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--accent);
		font-feature-settings: 'tnum';
		border-top: 1px solid var(--accent);
		padding-top: 0.25rem;
		width: 2.2rem;
	}
	@media (max-width: 480px) {
		.prose p { padding-left: 2.4rem; }
		.dropmark { width: 1.8rem; }
	}

	.plate-index {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0;
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--paper);
	}
	.plate-index li {
		border-right: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
	}
	.plate-index a {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1.1rem;
		text-decoration: none;
		border-bottom: none;
		transition:
			background var(--duration-fast) var(--ease),
			color var(--duration-fast) var(--ease);
	}
	.plate-index a:hover {
		background: var(--paper-warm);
	}
	.plate-index a:hover .plate-index-num,
	.plate-index a:hover .plate-index-arrow {
		color: var(--accent);
	}
	.plate-index-num {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.2em;
		color: var(--micro);
		font-feature-settings: 'tnum';
		min-width: 3.4ch;
	}
	.plate-index-body {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
		min-width: 0;
	}
	.plate-index-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		color: var(--ink);
		text-transform: uppercase;
		font-weight: 500;
	}
	.plate-index-h1 {
		font-family: var(--font-display);
		font-size: var(--fs-sm);
		color: var(--ghost);
		line-height: 1.4;
		font-variation-settings: 'opsz' 14;
	}
	.plate-index-arrow {
		font-family: var(--font-mono);
		color: var(--micro);
		transition: transform var(--duration-fast) var(--ease);
	}
	.plate-index a:hover .plate-index-arrow {
		transform: translateX(3px);
	}

	@keyframes fade-up {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
