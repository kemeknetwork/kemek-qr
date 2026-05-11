<script lang="ts">
	import { page } from '$app/state';
	import PlateIndex from '$lib/PlateIndex.svelte';
	import ExplainerSection from '$lib/ExplainerSection.svelte';

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
	<div class="title-block">
		<div class="title-block-corner title-block-tl">
			<span class="rubric">PLATE</span>
			<span class="value plate-large">{status}</span>
		</div>
		<div class="title-block-corner title-block-tr">
			<span class="rubric">SCALE</span>
			<span class="value">N · T · S</span>
		</div>
		<div class="title-block-corner title-block-bl">
			<span class="rubric">EDITION</span>
			<span class="value value-version">v{__APP_VERSION__}</span>
		</div>
		<div class="title-block-corner title-block-br">
			<span class="rubric">FILE</span>
			<span class="value">{fileTag}</span>
		</div>

		<div class="title-block-body">
			<span class="title-rubric">ERRATUM · UNFILED REFERENCE</span>
			<h1 class="hero-title">{message}.</h1>
			<p class="hero-sub">
				The URL you followed doesn’t match any plate in the index — likely a typo, an old link, or a
				path that never existed. The full drafting set is below; pick one up.
			</p>
			<div class="hero-cta-wrap">
				<a href="/" class="hero-cta">
					<span class="hero-cta-arrow" aria-hidden="true">←</span>
					<span class="hero-cta-label">Return to plate 01</span>
				</a>
			</div>
		</div>
	</div>
</section>

<section class="explainer">
	<ExplainerSection marker="§01" title="Plate index" />
	<PlateIndex compact labelKind="plateLabel" />
</section>

<style>
	/* Title-block + hero + explainer styles mirror about/+page.svelte
	 * (which in turn mirrors LandingPage.svelte). Tier 2 of the M1
	 * refactor is the planned TitleBlock component extract that would
	 * eliminate this 3-way duplication; until that lands, drift this
	 * file in lockstep when the others change. */
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
	.title-block-corner {
		min-width: 0;
	}
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
		font-size: 12px;
		letter-spacing: 0.32em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.title-block-corner .value {
		font-size: 14px;
		letter-spacing: 0.14em;
		color: var(--ink);
		text-transform: uppercase;
		font-feature-settings: 'tnum';
	}
	.title-block-corner .value-version {
		text-transform: none;
		letter-spacing: 0.06em;
	}
	.plate-large {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3.7vw, 2.55rem);
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
			font-size: 11px;
			letter-spacing: 0.26em;
		}
		.title-block-corner .value {
			font-size: 13px;
			letter-spacing: 0.1em;
		}
		.plate-large {
			font-size: clamp(1.35rem, 6.4vw, 1.85rem);
			margin-top: 0.05rem;
		}
	}
	@media (max-width: 380px) {
		.title-block-corner .value:not(.plate-large) {
			font-size: 12px;
			letter-spacing: 0.04em;
		}
	}

	.title-block-body {
		grid-row: 2;
		grid-column: 1 / -1;
		padding: clamp(1.4rem, 4vw, 2.5rem) clamp(0.25rem, 2vw, 2rem);
		text-align: center;
		position: relative;
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
		font-size: 13px;
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
		font-size: clamp(1.85rem, 5.4vw + 0.55rem, 4rem);
		line-height: 1.06;
		letter-spacing: -0.025em;
		margin: 0 auto 1.2rem;
		color: var(--ink);
		max-width: min(22ch, 100%);
		font-variation-settings: 'opsz' 144;
		text-wrap: balance;
		overflow-wrap: anywhere;
	}
	@media (max-width: 540px) {
		.title-rubric {
			font-size: 12px;
			letter-spacing: 0.24em;
			padding: 0.3rem 0.55rem;
			margin-bottom: 0.85rem;
		}
	}
	@media (max-width: 380px) {
		.title-rubric {
			font-size: 11px;
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
			background var(--duration) var(--ease),
			color var(--duration) var(--ease);
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
