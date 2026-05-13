# kemek-qr — brand usage

The `kemek-qr` code is MIT-licensed — fork, modify, ship, sell. The
**brand is not**: the name "KeMeK Network" and the brand mark
(three QR-style finder eyes + a quincunx of data cells in the BR
quadrant) are trademarks of KeMeK Network.

You can use the brand assets in this folder for two purposes only:

1. **Referring back to kemek-qr** (e.g., "built with kemek-qr,"
   linking to qr.kemek.com from your own site).
2. **Embedded in unmodified screenshots** of the kemek-qr app (e.g.,
   in blog posts, reviews, tutorials).

You cannot:

- Use the mark or the "KeMeK" / "KeMeK Network" name as your own
  brand or sub-brand.
- Modify the mark and present it as the kemek-qr mark.
- Use the assets in a way that implies endorsement of your product
  by KeMeK Network.
- Apply for trademark registration on the mark or the name in any
  jurisdiction.

When in doubt: your fork is your brand, not ours. Rename, redesign,
ship.

---

## The canonical mark

The kemek-qr mark is a **bare 7 × 7 grid** of finder-pattern eyes (TL,
TR, BL) plus a 5-cell quincunx in the BR quadrant. **One color, no
background, no frame, no padding** — same shape definition as
`src/routes/+layout.svelte`'s `.brand-mark`. The mark inherits its
surface from whatever it sits on; brand identity is in the *shape*,
not in a paper rectangle around it.

The favicon (shipped at `static/favicon.svg`) is a different
artifact — it carries a cream paper rectangle + ink frame because
favicons need an opaque surface for browser tabs. That's
favicon-specific styling, not part of the mark.

## Files in this folder

| File | Use |
|---|---|
| `mark.svg` | Primary mark. Accent red (`#c53a1f`) on transparent. |
| `mark-dark.svg` | Dark-mode variant. Accent warm (`#e0492c`) on transparent — slightly brighter for dark surfaces. |
| `mark-mono-ink.svg` | Monochrome ink (`#0e0b06`) on transparent. For light surfaces where color isn't appropriate. |
| `mark-mono-cream.svg` | Monochrome cream (`#f9eedb`) on transparent. For dark surfaces where color isn't appropriate. |
| `mark-mono-accent.svg` | Accent red on transparent. Same as `mark.svg`; named alias for clarity at consumption sites. |
| `lockup-light.svg` | Horizontal lockup — accent mark + ink wordmark + accent slash, for light surfaces. Vector; falls back to Georgia/serif when Fraunces isn't available. |
| `lockup-dark.svg` | Horizontal lockup — accent mark + cream wordmark + accent slash, for dark surfaces. Same fallback note. |
| `lockup-light.png` | Pre-rasterized lockup (~ 1440 × 384) with Fraunces 500 baked in. Use this for README headers, social cards, anywhere SVG font-fallback would drift. |
| `lockup-dark.png` | Same as above, dark-surface variant. |
| `mark-256.png` | Mark rasterized at 256 × 256, transparent ground. |
| `mark-512.png` | Mark rasterized at 512 × 512, transparent ground. |
| `mark-1024.png` | Mark rasterized at 1024 × 1024, transparent ground. |
| `mark-2048.png` | Mark rasterized at 2048 × 2048, transparent ground. Use for print. |

PNG rasters are generated from the SVG masters via
`npm run build:images`. Don't edit the PNGs by hand; edit the SVG
and re-run the build.

---

## Color palette

The drafting-spec palette. CSS variable names match `src/app.css`
design tokens.

### Light mode

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F4EEE0` | Backgrounds, panels |
| `--paper-warm` | `#EFE6CF` | Warm hover / footer surfaces |
| `--ink` | `#0E0B06` | Primary text, mark fill, borders |
| `--accent` | `#C53A1F` | Accent — mark fill, highlights, active state |
| `--accent-deep` | `#9C2D17` | Pressed / deep accent |

### Dark mode

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#100E09` | Backgrounds |
| `--paper-warm` | `#16130D` | Warm hover / footer surfaces |
| `--ink` | `#F9EEDB` | Primary text, mark fill |
| `--accent` | `#E0492C` | Accent — slightly warmer / brighter than light-mode accent |

### Pairings

The mark's **default** treatment is `--paper` ground + `--ink`
frame + `--accent` marks. Don't invert these on the same surface.

For the dark variant, the equivalence is `--paper` (dark) +
`--ink` (cream) + `--accent` (warm) — same logical roles, dark-mode
token values.

---

## Typography

| Role | Family | Weight | Use |
|---|---|---|---|
| Wordmark + body / forms | **JetBrains Mono** | 400, 500, 600, 700 | Mono rubrics, hex values, the `kemek/qr` wordmark itself, all form labels, plate numbers. |
| Display headings | **Fraunces** | 400, 500 | H1/H2 display type. Set with negative letter-spacing (-0.01 to -0.02 em) at large sizes. |

The wordmark `kemek/qr` is set in **JetBrains Mono Bold (700)** with
the slash colored `--accent`. The slash isn't decorative — it's a
visual hinge between the umbrella brand (`kemek`) and the product
(`qr`). Don't replace it with a space or hyphen.

---

## Clear space

Minimum clear space around the mark = the width of one cell in the
7 × 7 grid (i.e. ~ 14% of the mark width). Treat that perimeter as
inviolable — no other type or shape inside it.

The mark itself has no frame or quiet-zone border — that's
intentional. The 5-cell quincunx in the BR quadrant IS the quiet
zone in spirit; the silhouette is the mark.

---

## Minimum size

| Surface | Min size |
|---|---|
| Digital / web | 16 × 16 px (favicon scale) |
| Print | 12 × 12 mm (business-card scale) |

Below these sizes the finder-eye details collapse and the mark stops
reading as a stylized QR. Use the wordmark alone if you need a
smaller mark, or use a single finder-eye glyph as a degraded micro
mark (not currently shipped — file an issue if you need it).

---

## What NOT to do

- **Don't recolor the mark with custom hex values.** Use one of the
  pre-built variants. The palette is locked.
- **Don't add a frame or background box around the mark.** The mark
  is the silhouette of the 7 × 7 grid — the surface around it is
  whatever it sits on, not part of the mark.
- **Don't rotate the mark.** It's a QR-shaped mark; rotation breaks
  the visual "this is QR" cue.
- **Don't add drop shadows, glows, or bevels.** Brand voice is flat
  drafting-spec, not skeuomorphic.
- **Don't combine the mark with other logos in a way that implies
  endorsement** (e.g., "Tool X + kemek-qr" lockups). A simple
  link-and-credit is fine.
- **Don't crop, distort, or change the aspect ratio.** The mark is
  square; the lockup is 480 × 128. Scale uniformly.
- **Don't use the mark on a busy / photographic background.** Place
  it on a flat surface in `--paper` or `--ink` (or analogous neutral
  whites/blacks for non-kemek surfaces).

---

## Attribution

When attributing kemek-qr (e.g., "Built with kemek-qr"), prefer:

> Built with [kemek-qr](https://qr.kemek.com) — free, private,
> in-browser QR code generator.

Or short form:

> QR by [kemek-qr](https://qr.kemek.com).

The trademark notice that should accompany any commercial use of
the brand assets:

> "KeMeK Network" and the kemek-qr mark are trademarks of
> KeMeK Network. Used with permission.

---

`Copyright © 2026 KeMeK Network. Brand assets distributed under
trademark carve-out (above); code under [MIT](../../LICENSE).`
