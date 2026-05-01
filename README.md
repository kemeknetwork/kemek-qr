# kemek-qr

Free, fully client-side QR code generator. No signup. No tracking. No upload.

Part of the [KeMeK Network](https://kemek.com) family of free utilities. Generated entirely in your browser — your data never leaves your machine.

## Stack

- SvelteKit (Svelte 5, runes)
- TypeScript + Vite
- [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling) for encoding and styled rendering
- `pdf-lib` (Phase 1 — PDF export)
- `@sveltejs/adapter-static` — fully prerendered static output
- Vanilla CSS (no Tailwind, no UI framework)

## Develop

```sh
npm install
npm run dev    # http://localhost:5184
```

## Build

```sh
npm run build  # static output in build/
npm run preview
```

## Status

Phase 0 — single-page prototype with URL-only generator, basic styling controls, and PNG export at 1024 px. See spec docs (local-only, gitignored) for the full v1 plan.

## License

TBD. Source available; redistribution and reuse policy will land before public launch.
