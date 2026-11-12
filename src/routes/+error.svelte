<script lang="ts">
	import { page } from '$app/state';
	import PlateIndex from '$lib/PlateIndex.svelte';
	import ExplainerSection from '$lib/ExplainerSection.svelte';
	import TitleBlock from '$lib/TitleBlock.svelte';

	const status = $derived(page.status);
	const message = $derived(page.error?.message || 'Plate not on file');
	const fileTag = $derived(`KMK·QR·${status}`);
	const title = $derived(`${status} · ${message} | kemek/qr`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta
		name="description"
		content="{status} — the requested page is not on the kemek/qr drafting set."
	/>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<section class="hero" aria-label="Title block">
	<TitleBlock
		compact
		tl={{ rubric: 'PLATE', value: String(status) }}
		tr={{ rubric: 'SCALE', value: 'N · T · S' }}
		bl={{ rubric: 'EDITION', value: `v${__APP_VERSION__}` }}
		br={{ rubric: 'FILE', value: fileTag }}
		rubric={'ERRATUM · UNFILED REFERENCE'}
		title={`${message}.`}
		sub="The URL you followed doesn’t match any plate in the index — likely a typo, an old link, or a path that never existed. The full drafting set is below; pick one up."
	>
		<div class="hero-cta-wrap">
			<a href="/" class="hero-cta">
				<span class="hero-cta-arrow" aria-hidden="true">←</span>
				<span class="hero-cta-label">Return to plate 01</span>
			</a>
		</div>
	</TitleBlock>
</section>

<section class="explainer">
	<ExplainerSection marker="§01" title="Plate index" />
	<PlateIndex compact labelKind="plateLabel" />
</section>

<style>
	/* Title-block frame / corners / typography ship from
	 * `lib/TitleBlock.svelte` (compact prop). The smaller back-link
	 * CTA below is page-local — it's a different visual treatment
	 * from LandingPage's mobile-only primary action. */
	.hero {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2.5rem, 6vw, 4rem) var(--gutter) clamp(1.5rem, 4vw, 2.5rem);
		animation: fade-up var(--duration-slow) var(--ease) both;
	}

	.hero-cta-wrap {
		display: flex;
		justify-content: center;
		margin-top: 0.4rem;
	}
	.hero-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--paper);
		background: var(--accent);
		padding: 0.65rem 1.1rem;
		border: 1px solid var(--accent);
		text-decoration: none;
		transition:
			background var(--duration-fast) var(--ease),
			color var(--duration-fast) var(--ease);
	}
	.hero-cta:hover,
	.hero-cta:focus-visible {
		background: var(--paper);
		color: var(--accent);
	}
	.hero-cta-arrow {
		font-size: 1.05em;
		line-height: 1;
	}

	.explainer {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.5rem) var(--gutter) clamp(3rem, 6vw, 5rem);
		animation: fade-up var(--duration-slow) var(--ease) 360ms both;
	}

	/* @keyframes fade-up lives in app.css — see comment there. */
</style>
