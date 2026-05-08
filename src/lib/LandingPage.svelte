<script lang="ts">
	import Generator from './Generator.svelte';
	import QRAnatomy from './QRAnatomy.svelte';
	import { LANDING_COPY } from './landing-copy';
	import { CONTENT_TYPES, PLATE, type ContentType } from './types';

	let { type }: { type: ContentType } = $props();
	const copy = $derived(LANDING_COPY[type]);
	/* Render all 8 plates; the current page is hidden by CSS on
	 * multi-column layouts (where the missing tile would be a visible
	 * gap) and shown on mobile single-column (where filling the
	 * stack reads as a complete index). */
	const allPlates = $derived(
		(CONTENT_TYPES as readonly ContentType[]).map((t) => ({
			...LANDING_COPY[t],
			isCurrent: t === type
		}))
	);
	const plate = $derived(PLATE[type]);

	const SITE = 'https://qr.kemek.com';
	const canonicalUrl = $derived(`${SITE}${copy.path}`);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: copy.h1,
		description: copy.metaDesc,
		url: canonicalUrl,
		applicationCategory: 'UtilitiesApplication',
		operatingSystem: 'Any',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		isAccessibleForFree: true,
		creator: {
			'@type': 'Organization',
			name: 'KeMeK Network',
			url: 'https://kemek.com'
		}
	});

	const faqJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: copy.faq.map((entry) => ({
			'@type': 'Question',
			name: entry.q,
			acceptedAnswer: { '@type': 'Answer', text: entry.a }
		}))
	});
</script>

<svelte:head>
	<title>{copy.metaTitle}</title>
	<meta name="description" content={copy.metaDesc} />
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={copy.metaTitle} />
	<meta property="og:description" content={copy.metaDesc} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:site_name" content="KeMeK QR" />
	<meta name="twitter:title" content={copy.metaTitle} />
	<meta name="twitter:description" content={copy.metaDesc} />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>`}
</svelte:head>

<section class="hero" aria-label="Title block">
	<div class="title-block">
		<div class="title-block-corner title-block-tl">
			<span class="rubric">PLATE</span>
			<span class="value plate-large">{plate}</span>
		</div>
		<div class="title-block-corner title-block-tr">
			<span class="rubric">SCALE</span>
			<span class="value">1 : 1</span>
		</div>
		<div class="title-block-corner title-block-bl">
			<span class="rubric">EDITION</span>
			<span class="value value-version">v{__APP_VERSION__}</span>
		</div>
		<div class="title-block-corner title-block-br">
			<span class="rubric">FILE</span>
			<span class="value">KMK·QR·{plate}</span>
		</div>

		<div class="title-block-body">
			<span class="title-rubric">FIGURE A · {copy.shortLabel} ENCODE</span>
			<h1 class="hero-title">{copy.h1}</h1>
			<p class="hero-sub">{copy.sub}</p>

			<div class="hero-cta-wrap">
				<a href="#p-01" class="hero-cta">
					<span class="hero-cta-label">Create QR code</span>
					<span class="hero-cta-arrow" aria-hidden="true">↓</span>
				</a>
			</div>

			<dl class="title-meta">
				<div>
					<dt>process</dt>
					<dd>client-side · zero upload</dd>
				</div>
				<div>
					<dt>cost</dt>
					<dd>free · no signup · no expiry</dd>
				</div>
				<div>
					<dt>format</dt>
					<dd>PNG · SVG · PDF</dd>
				</div>
				<div>
					<dt>license</dt>
					<dd>
						<a
							class="title-meta-link"
							href="https://github.com/KeMeK-Network/kemek-QR/blob/main/LICENSE"
							target="_blank"
							rel="license noopener"
						>MIT</a> · open source
					</dd>
				</div>
			</dl>
		</div>
	</div>
</section>

<Generator {type} />

<section class="explainer">
	<header class="section-head">
		<span class="section-marker">§01</span>
		<h2 class="section-title">Notes on the artifact</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<div class="prose">
		{#each copy.paragraphs as p, i}
			<p><span class="dropmark" aria-hidden="true">{(i + 1).toString().padStart(2, '0')}</span>{p}</p>
		{/each}
	</div>

	<header class="section-head">
		<span class="section-marker">§02</span>
		<h2 class="section-title">Footnotes &amp; queries</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<dl class="faq">
		{#each copy.faq as entry, i}
			<div class="faq-entry">
				<dt>
					<span class="faq-marker" aria-hidden="true">※{i + 1}</span>
					{entry.q}
				</dt>
				<dd>{entry.a}</dd>
			</div>
		{/each}
	</dl>

	<header class="section-head">
		<span class="section-marker">§03</span>
		<h2 class="section-title">Anatomy of the code</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<QRAnatomy />

	<header class="section-head">
		<span class="section-marker">§04</span>
		<h2 class="section-title">Plate index</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<ol class="plate-index">
		{#each allPlates as o}
			<li class:is-current={o.isCurrent}>
				<a href={o.path} aria-current={o.isCurrent ? 'page' : undefined}>
					<span class="plate-index-num">PL.{PLATE[o.path === '/' ? 'url' : (o.path.slice(1) as ContentType)]}</span>
					<span class="plate-index-body">
						<span class="plate-index-label">{o.shortLabel}</span>
						<span class="plate-index-h1">{o.h1}</span>
					</span>
					<span class="plate-index-arrow" aria-hidden="true">→</span>
				</a>
			</li>
		{/each}
	</ol>
</section>

<style>
	/* ─── Hero / title block ───────────────────────────────────
	   The page opens with a drafting-sheet title block: corner
	   cells with rubrics, large plate number, the H1 sitting in
	   the center band like the title of a published spec sheet. */
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
		gap: 0;
	}
	.title-block-corner { min-width: 0; }
	.title-block::before,
	.title-block::after {
		content: '';
		position: absolute;
		pointer-events: none;
		color: var(--accent);
	}
	/* corner ticks on the title block frame */
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
	.title-block-tl {
		justify-self: start;
		grid-row: 1;
		grid-column: 1;
		padding-left: 0;
	}
	.title-block-tr {
		justify-self: end;
		text-align: right;
		grid-row: 1;
		grid-column: 2;
		padding-right: 0;
	}
	.title-block-bl {
		justify-self: start;
		grid-row: 3;
		grid-column: 1;
		padding-left: 0;
	}
	.title-block-br {
		justify-self: end;
		text-align: right;
		grid-row: 3;
		grid-column: 2;
		padding-right: 0;
	}
	.title-block-corner .rubric {
		font-size: 14px;
		letter-spacing: 0.32em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.title-block-corner .value {
		font-size: 16px;
		letter-spacing: 0.14em;
		color: var(--ink);
		text-transform: uppercase;
		font-feature-settings: 'tnum';
	}
	/* Version string shows the actual lowercase `v` from package.json
	 * rather than the all-caps treatment the other corner rubrics use
	 * — semantic-versioning convention is "v0.25.1", not "V0.25.1". */
	.title-block-corner .value-version {
		text-transform: none;
		letter-spacing: 0.06em;
	}
	.plate-large {
		font-family: var(--font-display);
		font-size: clamp(1.85rem, 4.25vw, 2.95rem);
		font-weight: 400;
		font-style: italic;
		color: var(--accent);
		letter-spacing: -0.02em;
		font-variation-settings: 'opsz' 36;
		line-height: 1;
		margin-top: 0.1rem;
	}
	@media (max-width: 540px) {
		.title-block-corner .rubric {
			font-size: 13px;
			letter-spacing: 0.26em;
		}
		.title-block-corner .value {
			font-size: 15px;
			letter-spacing: 0.1em;
		}
		.plate-large {
			font-size: clamp(1.55rem, 7.4vw, 2.15rem);
			margin-top: 0.05rem;
		}
	}
	/* Engineering-spec four-corner schedule preserved at every size.
	 * Cells shrink with the body but stay present — the metaphor is
	 * load-bearing for the brand. The minmax(0, 1fr) tracks above
	 * keep them honest no matter how long their tnum values are. */
	@media (max-width: 380px) {
		.title-block-corner .value:not(.plate-large) {
			font-size: 13px;
			letter-spacing: 0.04em;
		}
	}

	.title-block-body {
		grid-row: 2;
		grid-column: 1 / -1;
		padding: clamp(1.4rem, 4vw, 2.5rem) clamp(0.25rem, 2vw, 2rem);
		text-align: center;
		position: relative;
		/* min-width: 0 prevents intrinsic-content children (long h1
		 * text, links with tnum digits) from forcing the grid track
		 * wider than the column. Required because grid-column 1 / -1
		 * spans both 2-column tracks. */
		min-width: 0;
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
	.title-block-body::before {
		top: 0;
	}
	.title-block-body::after {
		bottom: 0;
	}

	.title-rubric {
		display: inline-block;
		max-width: 100%;
		font-family: var(--font-mono);
		font-size: 15px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 1.1rem;
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--accent);
		overflow-wrap: anywhere;
	}
	.hero-title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(2.13rem, 6.2vw + 0.63rem, 4.6rem);
		line-height: 1.06;
		letter-spacing: -0.025em;
		margin: 0 auto 1.2rem;
		color: var(--ink);
		/* `ch` is font-relative — at fluid display sizes, 22ch can
		 * compute wider than the container at intermediate widths,
		 * causing horizontal overflow. min(22ch, 100%) keeps the
		 * 22ch cap on big displays while clamping to container width
		 * everywhere else. */
		max-width: min(22ch, 100%);
		font-variation-settings: 'opsz' 144;
		text-wrap: balance;
		overflow-wrap: anywhere;
	}
	@media (max-width: 540px) {
		.title-rubric {
			font-size: 14px;
			letter-spacing: 0.24em;
			padding: 0.35rem 0.6rem;
			margin-bottom: 0.85rem;
		}
	}
	@media (max-width: 380px) {
		.title-rubric {
			font-size: 13px;
			letter-spacing: 0.18em;
			padding: 0.32rem 0.5rem;
		}
	}
	.hero-sub {
		font-family: var(--font-mono);
		font-size: 17px;
		color: var(--ghost);
		margin: 0 auto 1.5rem;
		max-width: 60ch;
		line-height: 1.65;
		letter-spacing: 0.01em;
	}

	/* Mobile-only "Create QR code" CTA — anchors to #p-01 (the form's
	 * first fieldset). Hidden on desktop because the form is already
	 * visible beside the QR; the button would be a redundant scroll
	 * to nowhere. Appears below ≤880 px (the workshop's stack point). */
	.hero-cta-wrap {
		display: none;
		text-align: center;
		margin: 0 auto 1.5rem;
	}
	@media (max-width: 880px) {
		.hero-cta-wrap {
			display: block;
		}
	}
	.hero-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		padding: 1.1rem 1.75rem;
		min-height: var(--touch);
		background: var(--accent);
		color: var(--paper);
		border: 2px solid var(--accent);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-weight: 500;
		font-size: 18px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		text-decoration: none;
		box-shadow: 0 12px 28px -16px var(--accent-deep, rgba(197, 58, 31, 0.55));
		transition:
			background var(--duration-fast) var(--ease),
			color var(--duration-fast) var(--ease),
			transform var(--duration-fast) var(--ease),
			box-shadow var(--duration-fast) var(--ease);
	}
	.hero-cta:hover,
	.hero-cta:focus-visible {
		background: var(--paper);
		color: var(--accent);
		outline: none;
	}
	.hero-cta:active {
		transform: translateY(1px);
		box-shadow: 0 6px 12px -8px var(--accent-deep, rgba(197, 58, 31, 0.5));
	}
	.hero-cta-arrow {
		font-size: 20px;
		line-height: 1;
		transform: translateY(1px);
	}

	.title-meta {
		display: grid;
		grid-template-columns: repeat(4, auto);
		justify-content: center;
		gap: 1.5rem 2rem;
		margin: 0;
		padding-top: 0.5rem;
		font-family: var(--font-mono);
	}
	.title-meta-link {
		color: var(--accent);
		border-bottom: 1px solid currentColor;
		transition: color var(--duration-fast) var(--ease);
	}
	.title-meta-link:hover {
		color: var(--accent-deep, var(--accent));
	}
	.title-meta div {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}
	.title-meta dt {
		font-size: 14px;
		letter-spacing: 0.28em;
		color: var(--micro);
	}
	.title-meta dd {
		margin: 0;
		font-size: 16px;
		letter-spacing: 0.06em;
		color: var(--ink);
		overflow-wrap: break-word;
		max-width: 100%;
	}
	/* Intermediate widths: 4 cells in a row get cramped between 720 px
	 * and 900 px (narrow desktop / large tablet). 2×2 grid with
	 * minmax(0, 1fr) tracks keeps cells legible AND lets each cell
	 * shrink with the container — the bare `auto` form would let the
	 * widest cell push the grid past viewport width. */
	@media (max-width: 900px) {
		.title-meta {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 720px) {
		.title-meta {
			grid-template-columns: 1fr;
			gap: 0.6rem;
			text-align: center;
		}
	}

	/* ─── Explainer ─────────────────────────────────────────────
	   Sectioned "notes / footnotes / index" structure modeled on
	   a publishedspec sheet. Section heads use a § marker pulled
	   into the margin.                                          */
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
		font-size: 18px;
		letter-spacing: 0.18em;
		color: var(--accent);
		font-feature-settings: 'tnum';
	}
	.section-title {
		font-family: var(--font-mono);
		font-weight: 500;
		font-size: 18px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ghost);
		margin: 0;
		/* Keep "Notes on the artifact" / "Footnotes & queries" on one
		 * line at common viewports so the dashed rule fills remaining
		 * width. At very narrow widths (≤380 px) the title would force
		 * horizontal scroll, so let it wrap there. */
		white-space: nowrap;
	}
	@media (max-width: 380px) {
		.section-title {
			white-space: normal;
		}
	}
	.section-rule {
		display: block;
		border-bottom: 1px dashed var(--rule);
		align-self: center;
		margin-top: -2px;
	}

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

	.faq {
		display: grid;
		gap: 1.5rem;
		max-width: 68ch;
		margin-left: auto;
		margin-right: auto;
	}
	.faq-entry {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: 1.1rem;
		row-gap: 0.4rem;
	}
	.faq-marker {
		grid-row: 1 / span 2;
		grid-column: 1;
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.06em;
		color: var(--accent);
		padding-top: 0.3rem;
		font-feature-settings: 'tnum';
	}
	.faq-entry dt {
		grid-column: 2;
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 500;
		font-size: 19px;
		color: var(--ink);
		line-height: 1.32;
		font-variation-settings: 'opsz' 36;
	}
	.faq-entry dd {
		grid-column: 2;
		margin: 0;
		font-family: var(--font-display);
		font-size: 17px;
		line-height: 1.6;
		color: var(--ink-soft);
		font-variation-settings: 'opsz' 14;
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
	/* Current page reads as "you are here" — muted, non-clickable
	 * (anchor still present for a11y; aria-current="page" announces
	 * the state to screen readers). Showing all eight fills the
	 * grid cleanly at every breakpoint — hiding the current would
	 * leave a trailing empty cell on desktop multi-column. */
	.plate-index li.is-current a {
		pointer-events: none;
		opacity: 0.55;
	}
	.plate-index li.is-current .plate-index-arrow {
		visibility: hidden;
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
		font-size: 13px;
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
		font-size: 13px;
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
