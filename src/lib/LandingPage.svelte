<script lang="ts">
	import Generator from './Generator.svelte';
	import { LANDING_COPY } from './landing-copy';
	import { CONTENT_TYPES, type ContentType } from './types';

	let { type }: { type: ContentType } = $props();
	const copy = $derived(LANDING_COPY[type]);
	const others = $derived(
		(CONTENT_TYPES as readonly ContentType[]).filter((t) => t !== type).map((t) => LANDING_COPY[t])
	);

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
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={copy.metaTitle} />
	<meta name="twitter:description" content={copy.metaDesc} />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>`}
</svelte:head>

<section class="hero">
	<span class="eyebrow">FIG. 01 — KEMEK / QR · {copy.shortLabel} ENCODE</span>
	<h1 class="hero-title">{copy.h1}</h1>
	<p class="hero-sub">{copy.sub}</p>
</section>

<hr class="rule" />

<Generator {type} />

<section class="explainer">
	<h2 class="section-title">About this generator</h2>
	{#each copy.paragraphs as p}
		<p>{p}</p>
	{/each}

	<h2 class="section-title">Common questions</h2>
	<dl class="faq">
		{#each copy.faq as entry}
			<div class="faq-entry">
				<dt>{entry.q}</dt>
				<dd>{entry.a}</dd>
			</div>
		{/each}
	</dl>

	<h2 class="section-title">Other QR types</h2>
	<ul class="cross-links">
		{#each others as o}
			<li>
				<a href={o.path}>
					<span class="cross-label">{o.shortLabel}</span>
					<span class="cross-h1">{o.h1}</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	.hero {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 5.5rem) var(--gutter) clamp(2rem, 4vw, 3rem);
		max-width: min(var(--max-w), 60ch);
		animation: fade-up var(--duration-slow) var(--ease) both;
	}
	.hero-title {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: var(--fs-display);
		line-height: 1.04;
		letter-spacing: -0.025em;
		margin: 0.85rem 0 1.6rem;
		color: var(--ink);
		font-variation-settings: 'opsz' 144;
	}
	.hero-sub {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		color: var(--ghost);
		margin: 0;
		max-width: 56ch;
		line-height: 1.65;
		letter-spacing: 0.01em;
	}
	.rule {
		border: none;
		border-top: 1px solid var(--rule);
		margin: 0 auto;
		max-width: var(--max-w);
	}

	.explainer {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3rem) var(--gutter) clamp(3rem, 6vw, 5rem);
		animation: fade-up var(--duration-slow) var(--ease) 360ms both;
	}
	.explainer p {
		max-width: 64ch;
		font-size: var(--fs-base);
		line-height: 1.65;
		color: var(--ink-soft);
		margin: 0 0 1.05rem;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 11;
	}
	.section-title {
		font-family: var(--font-mono);
		font-weight: 500;
		font-size: var(--fs-xs);
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ghost);
		margin: clamp(2rem, 4vw, 3rem) 0 1.1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--rule);
	}

	.faq {
		display: grid;
		gap: 1.25rem;
		max-width: 64ch;
	}
	.faq-entry {
		padding-left: 1rem;
		border-left: 2px solid var(--rule);
	}
	.faq-entry dt {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 500;
		font-size: var(--fs-md);
		color: var(--ink);
		margin-bottom: 0.5rem;
		line-height: 1.3;
	}
	.faq-entry dd {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--fs-base);
		line-height: 1.6;
		color: var(--ink-soft);
		font-variation-settings: 'opsz' 11;
	}

	.cross-links {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.4rem;
	}
	.cross-links a {
		display: flex;
		flex-direction: column;
		padding: 0.85rem 1rem;
		border: 1px solid var(--rule);
		border-radius: var(--radius-sm);
		background: var(--paper);
		text-decoration: none;
		transition:
			border-color var(--duration-fast) var(--ease),
			background var(--duration-fast) var(--ease);
	}
	.cross-links a:hover {
		border-color: var(--accent);
		background: var(--paper-warm);
	}
	.cross-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 0.35rem;
	}
	.cross-h1 {
		font-family: var(--font-display);
		font-size: var(--fs-sm);
		color: var(--ink);
		line-height: 1.4;
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
