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
		/* Keep titles on one line at desktop widths so the dashed rule
		 * fills remaining space. Below ~720 px the longer section
		 * titles ("Error correction & scan reliability" is 35 chars
		 * and ~378 px wide nowrap) force horizontal overflow on every
		 * phone- and tablet-portrait viewport — release nowrap there
		 * and let the title wrap naturally; the dashed rule still
		 * fills the trailing space on the last wrapped line. */
		white-space: nowrap;
	}
	@media (max-width: 720px) {
		.section-title {
			white-space: normal;
		}
	}
	.section-rule {
		display: block;
		align-self: center;
		margin-top: -2px;
		container-type: inline-size;
	}
	.section-rule::before {
		content: '';
		display: block;
		border-bottom: 1px dashed var(--rule);
	}
	/* A title that nearly fills the line squeezes the leader to a
	 * 10–20 px dash that reads as a stray mark, not a rule. Below 2rem
	 * of room, draw nothing. */
	@container (max-width: 2rem) {
		.section-rule::before {
			display: none;
		}
	}
</style>
