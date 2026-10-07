<script lang="ts">
	import ExplainerSection from './ExplainerSection.svelte';
	import Generator from './Generator.svelte';
	import PlateIndex from './PlateIndex.svelte';
	import QRAnatomy from './QRAnatomy.svelte';
	import TitleBlock from './TitleBlock.svelte';
	import { LANDING_COPY } from './landing-copy';
	import { PLATE, ROUTE_FOR_TYPE, TYPE_LABELS, type ContentType } from './types';

	let { type }: { type: ContentType } = $props();
	const copy = $derived(LANDING_COPY[type]);
	const plate = $derived(PLATE[type]);

	const SITE = 'https://qr.kemek.com';
	const canonicalUrl = $derived(`${SITE}${ROUTE_FOR_TYPE[type]}`);

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
	<TitleBlock
		tl={{ rubric: 'PLATE', value: plate }}
		tr={{ rubric: 'SCALE', value: '1 : 1' }}
		bl={{ rubric: 'EDITION', value: `v${__APP_VERSION__}` }}
		br={{ rubric: 'FILE', value: `KMK·QR·${plate}` }}
		rubric={`FIGURE A · ${TYPE_LABELS[type]} ENCODE`}
		title={copy.h1}
		sub={copy.sub}
	>
		<div class="hero-cta-wrap">
			<a href="#p-01" class="hero-cta">
				<span class="hero-cta-label">Create QR code</span>
				<span class="hero-cta-arrow" aria-hidden="true">↓</span>
			</a>
		</div>

		<dl class="title-meta">
			<div>
				<dt>process</dt>
				<dd><span>client-side</span> · <span>zero upload</span></dd>
			</div>
			<div>
				<dt>cost</dt>
				<dd><span>free</span> · <span>no signup</span> · <span>no expiry</span></dd>
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
						href="https://github.com/kemeknetwork/kemek-QR/blob/main/LICENSE"
						target="_blank"
						rel="license noopener">MIT</a
					>
					· <span>open source</span>
				</dd>
			</div>
		</dl>
	</TitleBlock>
</section>

<Generator {type} />

<section class="explainer">
	<ExplainerSection marker="§01" title="Notes on the artifact" />
	<div class="prose">
		{#each copy.paragraphs as p, i}
			<p>
				<span class="dropmark" aria-hidden="true">{(i + 1).toString().padStart(2, '0')}</span>{p}
			</p>
		{/each}
	</div>

	<ExplainerSection marker="§02" title="Footnotes & queries" />
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

	<ExplainerSection marker="§03" title="Anatomy of the code" />
	<QRAnatomy />

	<ExplainerSection marker="§04" title="Plate index" />
	<PlateIndex current={type} />
</section>

<style>
	/* Hero / title-block frame and body typography ship from
	 * `lib/TitleBlock.svelte`. Slotted-content styles below
	 * (.hero-cta-*, .title-meta-*) stay local — Svelte class
	 * hashing scopes them to this consuming page. */
	.hero {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2.5rem, 6vw, 4rem) var(--gutter) clamp(1.5rem, 4vw, 2.5rem);
		animation: fade-up var(--duration-slow) var(--ease) both;
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
		box-shadow: 0 12px 28px -16px var(--accent-deep);
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
		box-shadow: 0 6px 12px -8px var(--accent-deep);
	}
	.hero-cta-arrow {
		font-size: 20px;
		line-height: 1;
		transform: translateY(1px);
	}
	/* Phone portrait: the plate's inner width (~260–330 px) can't hold
	 * the 18 px / 0.2em label on one line, and a two-line "CREATE QR /
	 * CODE" reads as broken. Span the plate, keep one line, tighten
	 * the tracking. */
	@media (max-width: 480px) {
		.hero-cta {
			display: flex;
			width: 100%;
			white-space: nowrap;
			padding-inline: 1rem;
			letter-spacing: 0.14em;
		}
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
		color: var(--accent-deep);
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
	/* Wrap between "·" clauses, never inside one ("no / expiry"). */
	.title-meta dd span {
		white-space: nowrap;
	}
	/* Intermediate widths: 4 cells in a row get cramped below ~1100 px
	 * (each value wraps to two lines). 2×2 grid with
	 * minmax(0, 1fr) tracks keeps cells legible AND lets each cell
	 * shrink with the container — the bare `auto` form would let the
	 * widest cell push the grid past viewport width. */
	@media (max-width: 1100px) {
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

	/* @keyframes fade-up lives in app.css (used here + on the
	 * about page; defining it once keeps both pages on the
	 * same entrance animation). */
</style>
