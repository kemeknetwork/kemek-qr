<script lang="ts">
	import Generator from './Generator.svelte';
	import { LANDING_COPY } from './landing-copy';
	import { CONTENT_TYPES, type ContentType } from './types';

	let { type }: { type: ContentType } = $props();
	const copy = $derived(LANDING_COPY[type]);
	const others = $derived(
		(CONTENT_TYPES as readonly ContentType[]).filter((t) => t !== type).map((t) => LANDING_COPY[t])
	);

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
			<span class="value">I — V·MMXXVI</span>
		</div>
		<div class="title-block-corner title-block-br">
			<span class="rubric">FILE</span>
			<span class="value">KMK·QR·{plate}</span>
		</div>

		<div class="title-block-body">
			<span class="title-rubric">FIGURE A · {copy.shortLabel} ENCODE</span>
			<h1 class="hero-title">{copy.h1}</h1>
			<p class="hero-sub">{copy.sub}</p>

			<dl class="title-meta">
				<div>
					<dt>Process</dt>
					<dd>Client-side · zero upload</dd>
				</div>
				<div>
					<dt>Cost</dt>
					<dd>Free · no signup · no expiry</dd>
				</div>
				<div>
					<dt>Format</dt>
					<dd>PNG · SVG · PDF</dd>
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
		<h2 class="section-title">Plate index — other encodings</h2>
		<span class="section-rule" aria-hidden="true"></span>
	</header>
	<ol class="plate-index">
		{#each others as o}
			<li>
				<a href={o.path}>
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
		font-size: 9px;
		letter-spacing: 0.32em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.title-block-corner .value {
		font-size: 11px;
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
		.title-block-corner .rubric {
			font-size: 9px;
			letter-spacing: 0.26em;
		}
		.title-block-corner .value {
			font-size: 11px;
			letter-spacing: 0.1em;
		}
		.plate-large {
			font-size: clamp(1.25rem, 6vw, 1.75rem);
			margin-top: 0.05rem;
		}
	}
	/* Engineering-spec four-corner schedule preserved at every size.
	 * Cells shrink with the body but stay present — the metaphor is
	 * load-bearing for the brand. The minmax(0, 1fr) tracks above
	 * keep them honest no matter how long their tnum values are. */
	@media (max-width: 380px) {
		.title-block-corner .value:not(.plate-large) {
			font-size: 9px;
			letter-spacing: 0.04em;
		}
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
		font-size: 10.5px;
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
		.title-rubric {
			font-size: 9.5px;
			letter-spacing: 0.24em;
			padding: 0.3rem 0.55rem;
			margin-bottom: 0.85rem;
		}
	}
	@media (max-width: 380px) {
		.title-rubric {
			font-size: 8.5px;
			letter-spacing: 0.18em;
			padding: 0.28rem 0.45rem;
		}
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

	.title-meta {
		display: grid;
		grid-template-columns: repeat(3, auto);
		justify-content: center;
		gap: 2rem;
		margin: 0;
		padding-top: 0.5rem;
		font-family: var(--font-mono);
	}
	.title-meta div {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}
	.title-meta dt {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.title-meta dd {
		margin: 0;
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--ink);
	}
	@media (max-width: 600px) {
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
		font-size: 11px;
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
	.dropmark {
		position: absolute;
		left: 0;
		top: 0.55em;
		font-family: var(--font-mono);
		font-size: 9px;
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
		font-size: 11px;
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
		font-size: var(--fs-md);
		color: var(--ink);
		line-height: 1.32;
		font-variation-settings: 'opsz' 36;
	}
	.faq-entry dd {
		grid-column: 2;
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--fs-base);
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
		font-size: 10px;
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
		font-size: 10px;
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
