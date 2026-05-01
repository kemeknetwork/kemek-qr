<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { CONTENT_TYPES, TYPE_LABELS, type ContentType } from '$lib/types';

	let { children } = $props();

	/* Map a route pathname to its ContentType. `/` is the URL generator
	 * (canonical landing); each /<type> is a per-type landing page. */
	const ROUTE_FOR_TYPE: Record<ContentType, string> = {
		url: '/',
		text: '/text',
		wifi: '/wifi',
		vcard: '/vcard',
		email: '/email',
		sms: '/sms',
		phone: '/phone',
		geo: '/geo'
	};

	const activeType = $derived.by<ContentType>(() => {
		const path = page.url.pathname || '/';
		if (path === '/') return 'url';
		const match = (CONTENT_TYPES as readonly ContentType[]).find(
			(t) => t !== 'url' && (path === ROUTE_FOR_TYPE[t] || path.startsWith(`${ROUTE_FOR_TYPE[t]}/`))
		);
		return match ?? 'url';
	});
</script>

<svelte:head>
	<meta name="color-scheme" content="light" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="page-frame">
	<a href="#main" class="skip-link">Skip to generator</a>
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
		<nav class="type-nav" aria-label="QR content types">
			<div class="type-nav-inner">
				{#each CONTENT_TYPES as t}
					<a
						class="type-link"
						class:active={activeType === t}
						href={ROUTE_FOR_TYPE[t]}
						aria-current={activeType === t ? 'page' : undefined}
					>
						{TYPE_LABELS[t]}
					</a>
				{/each}
			</div>
		</nav>
	</header>

	<main id="main" tabindex="-1">
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
			<span class="phase">PHASE 1 / 2026—05</span>
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

	.skip-link {
		position: absolute;
		left: 0;
		top: 0;
		transform: translateY(-200%);
		background: var(--ink);
		color: var(--paper);
		padding: 0.6rem 1rem;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		z-index: 100;
		border: none;
		text-decoration: none;
		transition: transform var(--duration-fast) var(--ease);
	}
	.skip-link:focus {
		transform: translateY(0);
	}

	.masthead {
		border-bottom: 1px solid var(--rule);
		background: var(--paper);
	}
	.masthead-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 1.1rem var(--gutter);
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

	.type-nav {
		border-top: 1px solid var(--rule);
		background: var(--paper-warm);
	}
	.type-nav-inner {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 0 var(--gutter);
		display: flex;
		gap: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.type-nav-inner::-webkit-scrollbar {
		display: none;
	}
	.type-link {
		flex: 1 0 auto;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		padding: 0.7rem 1.1rem;
		color: var(--ghost);
		border-bottom: 2px solid transparent;
		border-top: 2px solid transparent;
		text-decoration: none;
		transition:
			color var(--duration-fast) var(--ease),
			border-color var(--duration-fast) var(--ease);
		white-space: nowrap;
	}
	.type-link:hover {
		color: var(--ink);
	}
	.type-link.active {
		color: var(--ink);
		border-bottom-color: var(--accent);
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
