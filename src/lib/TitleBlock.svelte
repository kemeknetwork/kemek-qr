<script lang="ts">
	/* Drafting-sheet title block — the single canonical implementation
	 * for the page-opening hero on every per-type landing, the about
	 * page, and the error page. Three call sites previously kept three
	 * lockstep copies of ~200 lines of CSS + ~50 lines of HTML; every
	 * brand-language tweak (rubric letter-spacing, plate-large opsz,
	 * corner padding) had to land in all three. Rule of Three fired
	 * here pre-v1; this component is the canonical home.
	 *
	 * Body slot is for page-specific accessories (CTA, title-meta dl)
	 * that vary in shape per call site. The .hero-cta-* and .title-meta-*
	 * classes are :global() here so slotted children pick them up. */

	import type { Snippet } from 'svelte';

	type CornerCell = {
		/* All-caps two-line corner label: rubric on top, value below. */
		rubric: string;
		value: string;
		/* Top-left number treatment: large italic display face. Used on
		 * the per-type landings (plate number) and error page (status
		 * code). About uses a literal '∞' here. */
		plateLarge?: boolean;
		/* Version strings (`vX.Y.Z`) read as semver, not as a tracked
		 * uppercase rubric value — applies condensed letter-spacing
		 * and preserves the lowercase `v`. */
		versionValue?: boolean;
	};

	let {
		tl,
		tr,
		bl,
		br,
		rubric,
		title,
		sub,
		compact = false,
		children
	}: {
		tl: CornerCell;
		tr: CornerCell;
		bl: CornerCell;
		br: CornerCell;
		rubric: string;
		title: string;
		sub: string;
		/* Secondary-surface rendering — about and +error pages step
		 * down ~1-2 px across rubric / value / title / sub sizes so
		 * the title block reads as a citation of the per-type
		 * landings rather than competing with them. Default false. */
		compact?: boolean;
		children?: Snippet;
	} = $props();
</script>

<div class="title-block" class:compact>
	<div class="title-block-corner title-block-tl">
		<span class="rubric">{tl.rubric}</span>
		<span class="value" class:plate-large={tl.plateLarge} class:value-version={tl.versionValue}
			>{tl.value}</span
		>
	</div>
	<div class="title-block-corner title-block-tr">
		<span class="rubric">{tr.rubric}</span>
		<span class="value" class:plate-large={tr.plateLarge} class:value-version={tr.versionValue}
			>{tr.value}</span
		>
	</div>
	<div class="title-block-corner title-block-bl">
		<span class="rubric">{bl.rubric}</span>
		<span class="value" class:plate-large={bl.plateLarge} class:value-version={bl.versionValue}
			>{bl.value}</span
		>
	</div>
	<div class="title-block-corner title-block-br">
		<span class="rubric">{br.rubric}</span>
		<span class="value" class:plate-large={br.plateLarge} class:value-version={br.versionValue}
			>{br.value}</span
		>
	</div>

	<div class="title-block-body">
		<span class="title-rubric">{rubric}</span>
		<h1 class="hero-title">{title}</h1>
		<p class="hero-sub">{sub}</p>
		{@render children?.()}
	</div>
</div>

<style>
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
		min-width: 0;
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
	/* Version string keeps the lowercase `v` from package.json — the
	 * semver convention is "v0.25.1", not "V0.25.1". */
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

	/* ── Compact variant ────────────────────────────────────
	 * About + error pages render the title block one notch
	 * smaller — they're secondary surfaces citing the primary
	 * landings, not headlining their own content. */
	.title-block.compact .rubric {
		font-size: 12px;
	}
	.title-block.compact .value {
		font-size: 14px;
	}
	.title-block.compact .plate-large {
		font-size: clamp(1.6rem, 3.7vw, 2.55rem);
	}
	.title-block.compact .title-rubric {
		font-size: 13px;
		letter-spacing: 0.32em;
		padding: 0.35rem 0.7rem;
	}
	.title-block.compact .hero-title {
		font-size: clamp(1.85rem, 5.4vw + 0.55rem, 4rem);
	}
	.title-block.compact .hero-sub {
		font-size: var(--fs-sm);
	}
	@media (max-width: 540px) {
		.title-block.compact .rubric {
			font-size: 11px;
		}
		.title-block.compact .value {
			font-size: 13px;
		}
		.title-block.compact .plate-large {
			font-size: clamp(1.35rem, 6.4vw, 1.85rem);
		}
		.title-block.compact .title-rubric {
			font-size: 12px;
			letter-spacing: 0.24em;
			padding: 0.3rem 0.55rem;
		}
	}
	@media (max-width: 380px) {
		.title-block.compact .value:not(.plate-large) {
			font-size: 12px;
		}
		.title-block.compact .title-rubric {
			font-size: 11px;
			letter-spacing: 0.18em;
			padding: 0.28rem 0.45rem;
		}
	}

	/* Slotted-children styles (CTA, .title-meta) stay in the
	 * consuming page — each call site has a different shape:
	 *   - LandingPage: prominent "Create QR code" button, mobile-only;
	 *     full title-meta 4-column dl
	 *   - about: no children
	 *   - +error: small "Return to plate 01" back-link, always visible
	 * Svelte's class hashing scopes those styles per consuming
	 * component, so slotted content picks up the parent's scoped
	 * .hero-cta-* / .title-meta-* rules correctly. */
</style>
