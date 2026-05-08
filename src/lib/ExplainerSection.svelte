<script lang="ts">
	type Props = {
		marker: string;
		title: string;
		children?: import('svelte').Snippet;
	};
	let { marker, title, children }: Props = $props();
</script>

<header class="section-head">
	<span class="section-marker">{marker}</span>
	<h2 class="section-title">{title}</h2>
	<span class="section-rule" aria-hidden="true"></span>
</header>
{@render children?.()}

<style>
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
		/* Keep titles like "Notes on the artifact" / "Footnotes &
		 * queries" on one line at common viewports so the dashed rule
		 * fills remaining width. At very narrow widths (≤380 px) the
		 * title would force horizontal scroll, so let it wrap. */
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
</style>
