# kemek-qr

Free, fully client-side QR code generator. No signup. No tracking. No upload.

Part of the [KeMeK Network](https://kemek.com) family of free utilities. Generated entirely in your browser — your data never leaves your machine.

## Features

- **8 content types:** URL, text, WiFi, vCard, email, SMS, phone, geo location.
- **Styling:** foreground / background color, linear gradient, six dot styles, four eye-frame variants, three eye-ball variants, logo embedding, optional outer frame with custom label.
- **Exports:** PNG (1024 px), SVG (true vector), PDF (A4, vector frame + high-res QR).
- **Permalinks:** state encoded into the URL hash; share a configured QR by sharing the link. No server, no shortener.
- **Privacy:** zero outbound network requests during QR generation. Logo files read with FileReader and composited locally.

## Stack

- SvelteKit (Svelte 5, runes)
- TypeScript + Vite
- [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling) for encoding and styled rendering
- [`pdf-lib`](https://github.com/Hopding/pdf-lib) for PDF export
- [`vitest`](https://vitest.dev) for the encoder unit tests
- `@sveltejs/adapter-static` — fully prerendered static output
- Vanilla CSS (no Tailwind, no UI framework)

## Develop

```sh
npm install
npm run dev      # http://localhost:5184
npm run check    # svelte-check + tsc
npm test         # vitest run
npm run build    # static output in build/
npm run preview
```

## Routes

- `/` — URL generator (canonical)
- `/text`, `/wifi`, `/vcard`, `/email`, `/sms`, `/phone`, `/geo` — per-type generators with explainer copy and FAQ.

Each route is independently prerendered and carries its own SEO meta.

## License

MIT — see [LICENSE](./LICENSE). Copyright KeMeK Network.
