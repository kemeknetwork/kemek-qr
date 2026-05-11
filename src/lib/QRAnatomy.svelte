<script module lang="ts">
	/* Schematic of a QR code (drawn at version 2 / 25 × 25 modules
	 * because that's the smallest version with an alignment pattern,
	 * which lets the diagram show all six functional regions in one
	 * figure). User-facing labels stay version-agnostic.
	 *
	 * Geometry follows the QR spec: 7 × 7 finder patterns at TL/TR/BL,
	 * 1-module separators, 5 × 5 alignment pattern centered at module
	 * (18, 18), timing patterns on row 6 / col 6 between the finders,
	 * and a 4-module quiet zone (the spec minimum below which scanners
	 * reject the code).
	 *
	 * Data cells are scattered sparsely (~22 % density) to hint at
	 * "data territory" while staying visually subordinate to the
	 * called-out structural features. Cell positions are deterministic
	 * via a seeded LCG so the diagram is reproducible across builds.
	 *
	 * This script runs at *module* scope (Svelte 5 `<script module>`)
	 * so the geometry + cell layout is computed exactly once per page
	 * load instead of every time a route navigation re-mounts the
	 * component — the layout is purely deterministic, no per-instance
	 * state. */

	const SIZE = 25;
	const MODULE = 8;
	const ORIGIN_X = 240;
	const ORIGIN_Y = 60;
	const QUIET = 4 * MODULE;

	const FINDERS = [
		{ x: ORIGIN_X, y: ORIGIN_Y } /* TL */,
		{ x: ORIGIN_X + 18 * MODULE, y: ORIGIN_Y } /* TR */,
		{ x: ORIGIN_X, y: ORIGIN_Y + 18 * MODULE } /* BL */
	];

	const reserved = new Set<string>();
	const reserve = (c: number, r: number) => reserved.add(`${c},${r}`);

	for (let c = 0; c <= 8; c++) for (let r = 0; r <= 8; r++) reserve(c, r);
	for (let c = 16; c <= 24; c++) for (let r = 0; r <= 8; r++) reserve(c, r);
	for (let c = 0; c <= 8; c++) for (let r = 16; r <= 24; r++) reserve(c, r);
	for (let c = 16; c <= 20; c++) for (let r = 16; r <= 20; r++) reserve(c, r);
	for (let i = 9; i <= 15; i++) {
		reserve(i, 6);
		reserve(6, i);
	}
	/* Anchor cell so the DATA + ECC callout always lands on a visible
	 * module rather than floating in whitespace. */
	reserve(18, 14);

	let prng = 0x9e3779b9;
	const rand = () => {
		prng = (prng * 1103515245 + 12345) & 0x7fffffff;
		return prng / 0x7fffffff;
	};

	const dataCells: { x: number; y: number }[] = [];
	for (let r = 0; r < SIZE; r++) {
		for (let c = 0; c < SIZE; c++) {
			if (!reserved.has(`${c},${r}`) && rand() > 0.78) {
				dataCells.push({ x: ORIGIN_X + c * MODULE, y: ORIGIN_Y + r * MODULE });
			}
		}
	}
</script>

<figure class="anatomy">
	<svg
		viewBox="0 0 640 480"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
		aria-labelledby="anatomy-title anatomy-desc"
		class="anatomy-svg"
	>
		<title id="anatomy-title">QR code anatomy</title>
		<desc id="anatomy-desc"
			>Schematic of a QR code with six functional regions called out: three finder patterns at TL,
			TR and BL for orientation lock; one alignment pattern at BR for perspective correction; the
			timing patterns running between the finders that tell the scanner the cell pitch; the
			format-info bits surrounding the TL finder which encode the error- correction level and mask
			pattern; the data + Reed–Solomon error-correction codewords filling the rest of the grid; and
			the surrounding 4-module quiet zone (mandatory whitespace). Below the main diagram is a detail
			blow-up of one finder pattern at twice the scale, with a dimensional strip showing the
			1·1·3·1·1 module construction of the ring.</desc
		>

		<!-- Quiet zone — spec-mandated 4-module dashed margin -->
		<rect
			class="quiet-zone"
			x={ORIGIN_X - QUIET}
			y={ORIGIN_Y - QUIET}
			width={SIZE * MODULE + 2 * QUIET}
			height={SIZE * MODULE + 2 * QUIET}
		/>

		<g class="modules">
			<!-- Finder patterns (7×7 outer ring + 3×3 solid center) -->
			{#each FINDERS as f}
				<g transform="translate({f.x}, {f.y})">
					<rect x="0" y="0" width="56" height="8" />
					<rect x="0" y="48" width="56" height="8" />
					<rect x="0" y="0" width="8" height="56" />
					<rect x="48" y="0" width="8" height="56" />
					<rect x="16" y="16" width="24" height="24" />
				</g>
			{/each}

			<!-- Alignment pattern (5×5 outer ring + 1×1 center) -->
			<g transform="translate({ORIGIN_X + 16 * MODULE}, {ORIGIN_Y + 16 * MODULE})">
				<rect x="0" y="0" width="40" height="8" />
				<rect x="0" y="32" width="40" height="8" />
				<rect x="0" y="0" width="8" height="40" />
				<rect x="32" y="0" width="8" height="40" />
				<rect x="16" y="16" width="8" height="8" />
			</g>

			<!-- Timing patterns -->
			<rect x="312" y="108" width="8" height="8" />
			<rect x="328" y="108" width="8" height="8" />
			<rect x="344" y="108" width="8" height="8" />
			<rect x="360" y="108" width="8" height="8" />
			<rect x="288" y="132" width="8" height="8" />
			<rect x="288" y="148" width="8" height="8" />
			<rect x="288" y="164" width="8" height="8" />
			<rect x="288" y="180" width="8" height="8" />

			<!-- Format-info representative bits along TL's row 8 / col 8 -->
			<rect x="240" y="124" width="8" height="8" />
			<rect x="256" y="124" width="8" height="8" />
			<rect x="272" y="124" width="8" height="8" />
			<rect x="304" y="124" width="8" height="8" />
			<rect x="304" y="68" width="8" height="8" />
			<rect x="304" y="84" width="8" height="8" />
			<rect x="304" y="100" width="8" height="8" />

			<!-- Data anchor at module (18, 14) -->
			<rect x="384" y="172" width="8" height="8" />

			{#each dataCells as cell}
				<rect class="data-cell" x={cell.x} y={cell.y} width={MODULE} height={MODULE} />
			{/each}
		</g>

		<!-- Six callouts. 2 left + 4 right. Every leader strictly
		     horizontal, leader-y matches target-y; label-y is set 4 px
		     below leader so 13 px text optical-center aligns. Each
		     callout carries a primary label + secondary annotation. -->
		<g class="callouts">
			<line class="leader" x1="180" y1="92" x2="240" y2="92" />
			<circle class="dot" cx="244" cy="92" r="2.5" />
			<text class="label" x="174" y="96" text-anchor="end"
				>FINDER<tspan class="label-aux" dx="4">· ×3</tspan></text
			>
			<text class="label-sub" x="174" y="110" text-anchor="end">7 × 7 MODULES</text>

			<line class="leader" x1="180" y1="148" x2="240" y2="148" />
			<circle class="dot" cx="244" cy="148" r="2.5" />
			<text class="label" x="174" y="152" text-anchor="end">FORMAT INFO</text>
			<text class="label-sub" x="174" y="166" text-anchor="end">15 BITS · L-SHAPE</text>

			<line class="leader" x1="488" y1="28" x2="492" y2="28" />
			<circle class="dot" cx="484" cy="28" r="2.5" />
			<text class="label" x="498" y="32">QUIET ZONE</text>
			<text class="label-sub" x="498" y="46">4-MOD MARGIN</text>

			<line class="leader" x1="368" y1="112" x2="492" y2="112" />
			<circle class="dot" cx="364" cy="112" r="2.5" />
			<text class="label" x="498" y="116">TIMING PATTERN</text>
			<text class="label-sub" x="498" y="130">ALTERNATING CELLS</text>

			<line class="leader" x1="392" y1="176" x2="492" y2="176" />
			<circle class="dot" cx="388" cy="176" r="2.5" />
			<text class="label" x="498" y="180">DATA + ECC</text>
			<text class="label-sub" x="498" y="194">REED–SOLOMON</text>

			<line class="leader" x1="416" y1="232" x2="492" y2="232" />
			<circle class="dot" cx="412" cy="232" r="2.5" />
			<text class="label" x="498" y="236"
				>ALIGNMENT<tspan class="label-aux" dx="4">· BR</tspan></text
			>
			<text class="label-sub" x="498" y="250">PERSPECTIVE LOCK</text>
		</g>

		<!-- Inset divider — separates the main diagram from the
		     finder-pattern detail blow-up below. -->
		<line class="inset-divider" x1="80" y1="320" x2="560" y2="320" />

		<!-- ─── DETAIL · FINDER PATTERN ─────────────────────────
		     Zoomed cross-section of one finder pattern (drawn at 14 px
		     per module = 2 × the main diagram's scale). The dimensional
		     strip on the right shows the 1·1·3·1·1 module construction
		     that's load-bearing to QR scanning: the proportional ring
		     is unique enough that scanners can detect it at any
		     rotation, and three of these patterns triangulate the
		     code's orientation. -->
		<g class="inset">
			<text class="inset-rubric" x="80" y="346">DETAIL · FINDER PATTERN</text>
			<text class="inset-scale" x="560" y="346" text-anchor="end">SCALE 2:1</text>

			<!-- Zoomed finder at 14 px / module = 98 × 98 -->
			<g class="modules" transform="translate(248, 360)">
				<rect x="0" y="0" width="98" height="14" />
				<rect x="0" y="84" width="98" height="14" />
				<rect x="0" y="0" width="14" height="98" />
				<rect x="84" y="0" width="14" height="98" />
				<rect x="28" y="28" width="42" height="42" />
			</g>

			<!-- Dimensional strip on the right of the zoomed finder.
			     Vertical bracket + tick marks at module boundaries +
			     module-count digits in the middle of each band. -->
			<g class="dim-strip" transform="translate(360, 360)">
				<line class="dim-bracket" x1="0" y1="0" x2="0" y2="98" />
				<line class="dim-tick" x1="0" y1="0" x2="6" y2="0" />
				<line class="dim-tick" x1="0" y1="14" x2="6" y2="14" />
				<line class="dim-tick" x1="0" y1="28" x2="6" y2="28" />
				<line class="dim-tick" x1="0" y1="70" x2="6" y2="70" />
				<line class="dim-tick" x1="0" y1="84" x2="6" y2="84" />
				<line class="dim-tick" x1="0" y1="98" x2="6" y2="98" />

				<text class="dim-label" x="14" y="11">1</text>
				<text class="dim-label" x="14" y="25">1</text>
				<text class="dim-label" x="14" y="53">3</text>
				<text class="dim-label" x="14" y="81">1</text>
				<text class="dim-label" x="14" y="95">1</text>

				<text class="dim-summary" x="0" y="118">RING · 1·1·3·1·1</text>
			</g>

			<!-- Annotation labels on the left side of the zoomed
			     finder identifying each band's role. -->
			<g class="dim-anno">
				<text class="dim-anno-label" x="240" y="367" text-anchor="end">OUTER RING</text>
				<text class="dim-anno-label" x="240" y="389" text-anchor="end">QUIET BAND</text>
				<text class="dim-anno-label" x="240" y="412" text-anchor="end">SOLID CENTER</text>
				<text class="dim-anno-label" x="240" y="438" text-anchor="end">QUIET BAND</text>
				<text class="dim-anno-label" x="240" y="455" text-anchor="end">OUTER RING</text>
			</g>
		</g>
	</svg>

	<!-- Spec cartouche — engineering-strip with thin top + bottom rules,
	     mirroring the page's title-meta voice. Pulled out of the SVG so
	     the diagram stays focused on geometry and the metadata reflows
	     responsively as ordinary text. -->
	<div class="anatomy-spec">
		<span class="spec-rubric">QR ANATOMY</span>
		<span class="spec-sep" aria-hidden="true">·</span>
		<span>FUNCTIONAL REGIONS</span>
		<span class="spec-sep" aria-hidden="true">·</span>
		<span>DRAFTING SCHEMATIC</span>
	</div>

	<figcaption>
		Every QR code is a part-functional, part-data grid. Three <strong>finder patterns</strong>
		at the corners let a scanner lock orientation; an <strong>alignment pattern</strong> at the
		bottom-right corrects perspective skew when the code is photographed at an angle. The
		<strong>timing patterns</strong> — alternating modules running between the finders — tell the
		scanner the cell pitch. <strong>Format info</strong> encodes the error-correction level and mask
		pattern across 15 bits arranged in an L-shape. The rest of the grid is the payload — data plus
		Reed–Solomon error-correction codewords. The <strong>quiet zone</strong> is mandatory
		whitespace; without four clear modules of margin, scanners reject the code. The detail below the
		main figure shows the finder pattern's <strong>1·1·3·1·1 ring construction</strong> — proportions
		deliberately chosen so a scanner can recognise the pattern at any rotation, with three patterns at
		three corners triangulating the code's orientation.
	</figcaption>
</figure>

<style>
	.anatomy {
		margin: 0 auto;
		max-width: 70ch;
	}
	.anatomy-svg {
		display: block;
		width: 100%;
		height: auto;
		color: var(--ink);
		shape-rendering: crispEdges;
	}
	.modules rect {
		fill: currentColor;
	}
	.modules .data-cell {
		opacity: 0.4;
	}
	.quiet-zone {
		fill: none;
		stroke: currentColor;
		stroke-width: 0.8;
		stroke-dasharray: 3 3;
		/* Opacity bumped from 0.32 → 0.5 so the dashed margin still
		 * reads as a continuous boundary at small render sizes and
		 * survives leader-line crossings on the left edge (FINDER +
		 * FORMAT INFO leaders both pass through it). */
		opacity: 0.5;
	}
	.callouts .leader {
		stroke: var(--accent);
		stroke-width: 0.9;
		opacity: 0.85;
	}
	.callouts .dot {
		fill: var(--accent);
	}
	.callouts .label {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.18em;
		fill: var(--ink);
		text-transform: uppercase;
		font-weight: 500;
	}
	.callouts .label-aux {
		fill: var(--ghost);
		letter-spacing: 0.1em;
	}
	.callouts .label-sub {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		fill: var(--ghost);
		text-transform: uppercase;
		font-weight: 400;
	}

	/* Inset detail block (finder pattern blow-up) */
	.inset-divider {
		stroke: currentColor;
		stroke-width: 0.4;
		stroke-dasharray: 2 4;
		opacity: 0.28;
	}
	.inset-rubric {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.28em;
		fill: var(--accent);
		text-transform: uppercase;
		font-weight: 500;
	}
	.inset-scale {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		fill: var(--micro);
		text-transform: uppercase;
		font-feature-settings: 'tnum';
	}
	.dim-strip .dim-bracket,
	.dim-strip .dim-tick {
		stroke: var(--accent);
		stroke-width: 0.7;
		opacity: 0.85;
	}
	.dim-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		fill: var(--ink);
		font-weight: 500;
		font-feature-settings: 'tnum';
	}
	.dim-summary {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.18em;
		fill: var(--micro);
		text-transform: uppercase;
		font-weight: 400;
	}
	.dim-anno-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.16em;
		fill: var(--ghost);
		text-transform: uppercase;
		font-weight: 400;
	}

	/* Spec strip beneath the SVG — thin ruled band carrying figure
	 * number + title in the same drafting voice the page's title-meta
	 * uses. Version-agnostic; no module-count or scale claims that
	 * would be specific to the diagram's underlying v2 geometry. */
	.anatomy-spec {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		gap: 0.45rem;
		margin: 1.2rem auto 0;
		padding: 0.55rem 0;
		max-width: 56ch;
		border-top: 1px solid var(--rule);
		border-bottom: 1px solid var(--rule);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.22em;
		color: var(--micro);
		text-transform: uppercase;
	}
	.anatomy-spec .spec-rubric {
		color: var(--accent);
		font-weight: 500;
	}
	.anatomy-spec .spec-sep {
		color: var(--accent);
	}

	.anatomy figcaption {
		font-family: var(--font-display);
		font-size: 17px;
		line-height: 1.65;
		color: var(--ink-soft);
		margin: 1.2rem auto 0;
		font-variation-settings: 'opsz' 14;
		text-align: left;
		max-width: 56ch;
	}
	.anatomy figcaption strong {
		font-weight: 600;
		color: var(--ink);
	}
</style>
