<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>kemek/qr · the QR generator that doesn't want anything from you</title>
	<meta
		name="description"
		content="A free, fast, beautiful QR code generator that runs entirely in your browser. No signup, no email, no tracking, no upsell. Made by KeMeK Network."
	/>
	<meta name="color-scheme" content="light" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="page-frame">
	<header class="masthead">
		<div class="masthead-inner">
			<a class="brand" href="/">
				<span class="brand-mark" aria-hidden="true"></span>
				<span class="brand-name">kemek<span class="brand-slash">/</span>qr</span>
			</a>
			<span class="pill" aria-label="Privacy posture">
				NO SIGNUP <span class="pill-dot">·</span> NO TRACKING <span class="pill-dot">·</span> NO UPLOAD
			</span>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="colophon">
		<div class="colophon-inner">
			<span>
				A free utility from
				<a href="https://kemek.com">KeMeK Network</a>.
			</span>
			<span class="dot" aria-hidden="true">·</span>
			<span>Runs in your browser. Files never leave your device.</span>
			<span class="dot" aria-hidden="true">·</span>
			<span class="phase">PHASE 0 / 2026—05</span>
		</div>
	</footer>
</div>

<style>
	.page-frame {
		position: relative;
		z-index: 2;
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr auto;
	}

	.masthead {
		border-bottom: 1px solid var(--rule);
		padding: 1.1rem var(--gutter);
		background: var(--paper);
	}
	.masthead-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 22px;
		letter-spacing: -0.015em;
		border-bottom: none;
		font-variation-settings: 'opsz' 36;
	}
	.brand-mark {
		display: inline-block;
		width: 11px;
		height: 11px;
		background: var(--accent);
		transform: translateY(-1px) rotate(45deg);
	}
	.brand-name {
		font-feature-settings: 'ss01';
	}
	.brand-slash {
		color: var(--accent);
		margin: 0 0.06em;
		font-style: italic;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		color: var(--ghost);
		border: 1px solid var(--rule);
		padding: 0.32rem 0.7rem;
		border-radius: 99px;
		letter-spacing: 0.16em;
	}
	.pill-dot {
		color: var(--accent);
	}

	.colophon {
		border-top: 1px solid var(--rule);
		padding: 1.4rem var(--gutter);
		font-size: var(--fs-xs);
		color: var(--ghost);
	}
	.colophon-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		letter-spacing: 0.04em;
	}
	.colophon a {
		color: var(--ink);
	}
	.colophon .dot {
		color: var(--micro);
	}
	.phase {
		font-family: var(--font-mono);
		letter-spacing: 0.18em;
		color: var(--micro);
		margin-left: auto;
	}

	@media (max-width: 720px) {
		.pill {
			font-size: 9px;
			letter-spacing: 0.12em;
		}
		.phase {
			margin-left: 0;
		}
	}
</style>
