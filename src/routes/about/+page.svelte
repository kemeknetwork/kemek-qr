<script lang="ts">
	import ExplainerSection from '$lib/ExplainerSection.svelte';
	import PlateIndex from '$lib/PlateIndex.svelte';
	import TitleBlock from '$lib/TitleBlock.svelte';

	const SITE = 'https://qr.kemek.com';
	const canonicalUrl = `${SITE}/about`;
	const title = 'About kemek/qr — privacy posture, scope, license | KeMeK';
	const description =
		'How kemek/qr is built and why. A free, fully client-side QR code generator from KeMeK Network — no signup, no upload, MIT-licensed source.';

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
	<TitleBlock
		compact
		tl={{ rubric: 'SHEET', value: '∞', plateLarge: true }}
		tr={{ rubric: 'SCALE', value: 'N · T · S' }}
		bl={{ rubric: 'EDITION', value: `v${__APP_VERSION__}`, versionValue: true }}
		br={{ rubric: 'FILE', value: 'KMK·QR·ABOUT' }}
		rubric="COLOPHON · ABOUT THIS SPECIFICATION"
		title="A QR code generator that doesn’t want anything from you."
		sub="kemek/qr is a free utility from KeMeK Network. It runs entirely in your browser — no upload, no account, no expiry, no tracking. This page explains exactly what that means and where the limits are."
	/>
</section>

<section class="explainer">
	<ExplainerSection marker="§01" title="What kemek/qr is" />
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			A static-page web app for generating QR codes. You pick a content type (URL, plain text, WiFi credentials,
			vCard contact, mailto:, SMS, tel:, geo:), tune the styling, and download a print-ready PNG, SVG,
			or PDF. The generator and every export run in your browser — there is no backend involved at any
			step.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			"Static" here means the QR encodes its destination directly. There is no shortener, no redirect
			server, nothing tracking the scan. A static URL QR works for as long as the URL itself works; a
			static WiFi QR works as long as the network credentials match. None of these can be edited after
			the fact — to change the destination you regenerate the QR.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			The generator is a single SvelteKit app, prerendered to static HTML and bundled JavaScript. Cloudflare
			Pages serves the artifact; Cloudflare touches no request payloads beyond standard CDN logging.
		</p>
	</div>

	<ExplainerSection marker="§02" title="What we don’t do" />
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			<strong>No client-side analytics, no tracking scripts.</strong> No Google Analytics, no Plausible,
			no Umami — anything that injects a script tag and pings a server while you generate. We see what
			our host sees — aggregate pageview counts, no individual tracking, no cookies, no third-party scripts.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			<strong>No third-party assets.</strong> Fonts (Fraunces and JetBrains Mono) are bundled locally
			via npm packages, not loaded from Google Fonts. There is no CDN-hosted JavaScript, no embed scripts,
			no tracking pixels.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			<strong>No signup, no account, no email gate.</strong> Every feature is free at the same point:
			open the page, generate the code, download. Permalinks (the COPY LINK button on each generator)
			encode every setting into the URL hash so you can share or bookmark a configured QR without an account.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">04</span>
			<strong>No dynamic QRs, no scan analytics.</strong> Editable destinations and per-scan analytics
			require a server-side redirect, which would mean accounts, hosted endpoints, and tracking by construction.
			That is a different product. If you need it, choose a SaaS QR provider — there are many.
		</p>
	</div>

	<ExplainerSection marker="§03" title="How your data flows" />
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			Anything you type into a form (URL, WiFi password, contact name, etc.) stays in the browser tab.
			It is not sent over the wire. The QR image is rendered locally by a JavaScript library (<a
				href="https://github.com/kozakdenys/qr-code-styling">qr-code-styling</a
			>) and the file you download comes out of the same tab.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			If you upload a logo to embed in the QR, the file is read with the browser’s built-in
			<code>FileReader</code>, kept in memory, and composited into the output. It is never uploaded
			anywhere.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			Your last inputs persist between sessions via
			<code>localStorage</code> on the same device — also local, also under your control. Clearing
			site data clears the saved session. Loading a permalink (a URL with a <code>#s=…</code> hash) overrides
			the saved session for that visit.
		</p>
	</div>

	<ExplainerSection marker="§04" title="License & source" />
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			The kemek/qr source is
			<a href="https://github.com/KeMeK-Network/kemek-QR">on GitHub</a>
			under the MIT license. Read the code, fork it, run your own copy if you’d prefer. The privacy claims
			on this page reduce to "we ship no telemetry code"; the source is the proof.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			kemek/qr is part of the
			<a href="https://kemek.com">KeMeK Network</a> family of utilities. KeMeK Network builds privacy-first,
			local-first tools and full-stack apps — each one drawn to spec, opinionated in design, and built
			for the common good.
		</p>
	</div>

	<ExplainerSection marker="§05" title="Error correction & scan reliability" />
	<div class="prose">
		<p>
			<span class="dropmark" aria-hidden="true">01</span>
			Every QR code carries redundant data so the code still scans when part of it is damaged, smudged,
			scratched, or partially obscured. The redundancy level is called <em>error correction</em> and
			the spec defines four of them — L, M, Q, H — recovering roughly
			<strong>7%</strong>, <strong>15%</strong>, <strong>25%</strong>, and <strong>30%</strong>
			of the code respectively. Higher levels survive more damage but make the code denser (more modules
			in the same data) so dense codes at very small print sizes can be harder for cheap cameras to read.
			M is the everyday default for most uses.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">02</span>
			The
			<strong>AUTO</strong> setting in the generator picks
			<strong>M</strong> when the code is plain and
			<strong>H</strong> when a logo is embedded. The logo physically obscures part of the data region,
			and H builds enough redundancy that the obscured cells get reconstructed at scan time. If you're
			embedding a logo at the default 25% size, AUTO is almost always the right call. Manual override
			is there for the cases AUTO doesn't anticipate.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">03</span>
			Reach for <strong>Q</strong> if the code will be printed on something that sees real-world
			wear — sticker on a delivery box, label on outdoor signage, business card that lives in a
			wallet. The extra recovery margin pays for itself in scan success. Reach for
			<strong>H</strong>
			when you want a logo and a margin of safety on top, or for industrial-environment placements (workshop
			walls, construction sites) where scratches and dust are a given.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">04</span>
			Error correction is only half the scan-reliability story. The other half is
			<strong>contrast</strong> — the foreground/background combination must be readable by a
			camera. The convention is dark-on-light (most decoders assume it). The picker shows a live
			<code>CONTRAST n.n:1</code> readout — anything below 3:1 is flagged as LOW; foreground brighter
			than background is flagged as INVERTED. It's informational, not a gate: we trust you to ship what
			you mean. But if your scans fail in real-world lighting, contrast is the first thing to check.
		</p>
		<p>
			<span class="dropmark" aria-hidden="true">05</span>
			Size matters too. A QR code shrunk too small relative to the scanning distance won't resolve. Rule
			of thumb: the smallest visible square (a single module) should be at least 0.4&nbsp;mm at the viewer's
			eye-distance for reliable scanning. For arm's-length scans (palm-sized prints), the code itself
			should be at least 2&nbsp;cm × 2&nbsp;cm. For across-the-room scans (poster on a wall), scale up
			proportionally.
		</p>
	</div>

	<ExplainerSection marker="§06" title="Plate index" />
	<PlateIndex compact labelKind="plateLabel" />
</section>

<style>
	/* Title-block frame / corners / typography ship from
	 * `lib/TitleBlock.svelte` (compact prop on this page). */
	.hero {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2.5rem, 6vw, 4rem) var(--gutter) clamp(1.5rem, 4vw, 2.5rem);
		animation: fade-up var(--duration-slow) var(--ease) both;
	}

	.explainer {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.5rem) var(--gutter) clamp(3rem, 6vw, 5rem);
		animation: fade-up var(--duration-slow) var(--ease) 360ms both;
	}
	/* .section-head / .section-marker / .section-title / .section-rule
	 * styles live in `lib/ExplainerSection.svelte` (used here via
	 * <ExplainerSection marker="§NN" title="…" />). */

	.prose {
		max-width: 68ch;
		margin-left: auto;
		margin-right: auto;
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
		font-size: 11px;
		letter-spacing: 0.2em;
		color: var(--accent);
		font-feature-settings: 'tnum';
		border-top: 1px solid var(--accent);
		padding-top: 0.25rem;
		width: 2.2rem;
	}
	@media (max-width: 480px) {
		.prose p {
			padding-left: 2.4rem;
		}
		.dropmark {
			width: 1.8rem;
		}
	}

	/* @keyframes fade-up lives in app.css — see comment in
	 * LandingPage.svelte. */
</style>
