# hamanti

An art-style handbook: 300 original styles, eight source groups, and up to eight Pinterest references per style.

- Website: https://hamanti.vercel.app
- Free GitHub Pages address: https://dakiemdarktharr.github.io/hamanti/
- Public repository: https://github.com/dakiemdarktharr/hamanti

## Run locally

Requires Node.js 24.

```powershell
npm ci
npm run dev
```

Open http://localhost:4173. The app uses HTML, CSS and browser JavaScript, bundled with esbuild. Motion and Lenis provide the interactions. A small React island renders the official React Bits Topography background. MongoDB and its image API run separately from the local static preview.

The interface includes a typewriter title, scroll-revealed introduction, searchable style index, botanical scenery, curtain and line transitions, a rotating desktop reference gallery, a mobile image grid, and a footer reveal. Reduced-motion preferences and the pause control disable animated interactions. Search and group filters are shareable through the URL. Each style has a direct link such as `#/style/7`.

## Content and provenance

The source of truth is `D:\\notes\\vault_1\\Art Style Handbook`. The 300 names, descriptions, numbers, and eight groups in `artstyles-300.md` are preserved. The original four content files are unchanged; the original README is in `source-notes/README.md`.

Collection was resumed at the user's request, with an eight-reference limit. The app keeps the first eight usable original references where available, then selected new discoveries. The historical ten-reference coverage file remains an archive and is not the current coverage report.

- `data/searches/`: source results from Firecrawl and TinyFish, including observed Pinterest image URLs and board extraction records. Exa was also used to discover source pages.
- `data/unavailable-sources.json`: observed failures and oversized originals excluded from the displayed selection; source notes remain intact.
- `data/curation.json`: explicit one-based selections from those records.
- `data/references.json`: compiled references, source links, discovery provider, and palette data.
- `data/coverage.csv`: current coverage, with a target of eight per style.
- `data/media-map.json`: public source URL to MongoDB image ID mapping; no credentials or image bytes.
- `data/palettes.json`: fixed palettes extracted from the first available reference in source order.
- `data/migration-report.json`: upload totals and any unavailable sources.

A Pinterest pin links to an individual image page; a board or idea page links to a collection. Board titles are not artwork titles or creator credits. The collection contains indexed visual leads, not independently authenticated artwork. Missing coverage remains explicitly marked “Examples pending”; failed previews retain a source link. Images belong to their respective creators.

Refresh the source copies and rebuild after editing Obsidian:

```powershell
npm run sync:notes
npm run build
```

## MongoDB image archive

The real `hamanti` database has `images` (original binary files and metadata) and `references` (300 style records). Images are not committed to GitHub or bundled into the static site. Shared image URLs are stored once.

Store the MongoDB connection string in the ignored local `.env.local` file as `MONGODB_URI`. Never put it in public source or browser code.

```powershell
npm run build
node --env-file=.env.local scripts/migrate-images.mjs
npm run build
```

The migration is resumable, caches downloads in ignored `.image-cache/`, retains original image bytes, and records failures. It does not generate or transcode examples. A conservative 280 MB database ceiling avoids filling the existing shared free cluster; images over the delivery limit are reported instead of silently altered.

`api/images/[id].js` is a read-only Vercel Node endpoint. It serves only stored IDs, with immutable cache headers. The credential is server-side. The static GitHub Pages site uses this same API.

## Deploy

The repository's GitHub Pages workflow builds and publishes `dist/` after pushes to `main`. It does not run tests. Vercel serves the app and image endpoint; production requires `MONGODB_URI` configured as a secret.

Strongly recommended: install the Vercel CLI globally with `npm i -g vercel`. This enables `vercel env pull`, `vercel deploy`, and `vercel logs` without a temporary CLI cache.

```powershell
vercel deploy --prod
```

Keep the `hamanti.vercel.app` alias attached to the production deployment because compiled image URLs use it. A build does not crawl Pinterest or access MongoDB.

## Licenses and validation

The official React Bits Topography component and its MIT + Commons Clause license are in `vendor/react-bits/`. Font licenses ship in the built site's `licenses/` directory. Motion example interactions are independently implemented; no restricted Motion+ source was copied. The botanical SVGs are interface decoration, not reference images.

Builds and manual browser previews were used. No tests were added or run, as requested.
