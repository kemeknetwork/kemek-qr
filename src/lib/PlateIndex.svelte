<script lang="ts">
	import { LANDING_COPY } from './landing-copy';
	import { CONTENT_TYPES, PLATE, ROUTE_FOR_TYPE, TYPE_LABELS, type ContentType } from './types';

	type Props = {
		/* When set, the matching plate renders muted + non-clickable
		 * (`pointer-events: none`, `aria-current="page"`). The current
		 * page being shown in the index gives the desktop multi-column
		 * grid a complete shape — hiding it would leave a trailing
		 * empty cell at common breakpoints. */
		current?: ContentType;
		/* The about page renders this index at a slightly smaller scale
		 * than the per-type landings (12 px vs 13 px on `num` / `label`).
		 * Same selectors, same DOM — just the size cascade. */
		compact?: boolean;
		/* h1 vs short label — the per-type landings use the full
		 * `Free … QR code generator` h1; about uses `plateLabel`
		 * (`… QR code generator` without the leading `Free`) so the
		 * eight rows don't all start with "Free …" and dominate the
		 * page visually. */
		labelKind?: 'h1' | 'plateLabel';
	};

	let { current, compact = false, labelKind = 'h1' }: Props = $props();
</script>

<ol class="plate-index" class:compact>
	{#each CONTENT_TYPES as t}
		{@const o = LANDING_COPY[t]}
		{@const isCurrent = t === current}
		<li class:is-current={isCurrent}>
			<a href={ROUTE_FOR_TYPE[t]} aria-current={isCurrent ? 'page' : undefined}>
				<span class="plate-index-num">PL.{PLATE[t]}</span>
				<span class="plate-index-body">
					<span class="plate-index-label">{TYPE_LABELS[t]}</span>
					<span class="plate-index-h1">{labelKind === 'h1' ? o.h1 : o.plateLabel}</span>
				</span>
				<span class="plate-index-arrow" aria-hidden="true">→</span>
			</a>
		</li>
	{/each}
</ol>

<style>
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
	/* "You are here" — non-clickable, distinguished by a paper-warm
	 * background tint + italic h1 rather than opacity. Previously
	 * used `opacity: 0.55` which multiplied the already-muted
	 * `--micro` / `--ghost` text below WCAG AA contrast threshold
	 * (Lighthouse 2026-05-11 flagged it). Anchor still present for
	 * a11y; `aria-current="page"` announces the state to SR. */
	.plate-index li.is-current a {
		pointer-events: none;
		background: var(--paper-warm);
	}
	.plate-index li.is-current .plate-index-h1 {
		font-style: italic;
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

	/* Compact variant for the about page — same selectors, smaller
	 * `num` / `label` so eight cross-page navigation rows don't take
	 * over the page the way the per-type landing's 13 px scale does. */
	.plate-index.compact .plate-index-num,
	.plate-index.compact .plate-index-label {
		font-size: 12px;
	}
</style>
