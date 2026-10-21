# hamanti

A visual handbook of 300 web and interface aesthetics, typographic directions, and art influences.

- Website: https://hamanti.vercel.app
- Free GitHub Pages address: https://dakiemdarktharr.github.io/hamanti/
- Public repository: https://github.com/dakiemdarktharr/hamanti
- Canva component sheet: https://canva.link/gs5kjbknzcrey7w

## Run locally

Requires Node.js 24.

```powershell
npm ci
npm run dev
```

Open http://localhost:4173. The existing HTML, CSS, and browser JavaScript stack is bundled with esbuild. Motion and Lenis provide transitions and scrolling. A small React island hosts the official React Bits detail backgrounds. Lingdong Huang's Shan Shui Inf generates the home page's SVG landscape.

## Interface

The home page is one horizontal handscroll: title, introduction, alphabetical A–Z index and closing credits. Wheel and trackpad gestures move sideways; touch uses native horizontal swiping. Arrow keys, Page Up/Down, Home/End and previous/next controls offer keyboard navigation. Reduced-motion mode keeps the same navigation without smoothing. The reference detail pages retain their readable vertical layout and gallery.

The index is a single curved row with seven complete cards visible on desktop, five on tablets, and one readable card with a neighbouring preview on phones. The side cards turn toward the viewer; only visible cards and a small overscan receive transform updates. Offscreen card contents skip painting. Search, first-letter filtering and navigation remain visible while moving through the list. There are no family sections. Empty cards show a typographic placeholder and “Images to come”; descriptions stay in the detail view. Search includes names, aliases, descriptions and tags, tolerates a single-letter typo in longer words, and has a clear control and slash shortcut. Stable style IDs preserve existing detail URLs; displayed numbers and next-style navigation follow alphabetical order.

The flower graphic and 3D woodland have been replaced. Hand-drawn arrows lead right through the page, while an SVG shan shui landscape extends behind the introduction and index. The generator is from https://github.com/LingDong-/shan-shui-inf, pinned at `9f754d2b2e73495db7883d4d4055a7b0903b0454`, with its MIT license and attribution retained. Its legacy globals and seeded random generator are isolated in a classic Web Worker. Terrain and planning data are pruned, generation requests are coalesced, and distant jumps generate only the requested area. All ink uses the logo's `#222a20`, with wash opacity preserved on `#e9ebe2` paper. Scenery follows scrolling; it does not move on its own.

The landscape is decoded ahead of the viewport into a single SVG image layer and moved with a composited transform. Scrolling no longer changes a live SVG viewBox containing tens of thousands of paths. The previous layer stays visible until its replacement is decoded; temporary object URLs are revoked. The worker keeps a bounded terrain buffer and skips intervening terrain after distant navigation jumps.

The introduction starts revealing each word only after it passes the viewport's horizontal centre. Spaces sit outside the word spans, with generous line spacing; geometry is read before opacity updates. Reference images occupy most of the viewport; selecting one opens a larger, scrollable view. Single-image collections use the full gallery width. Detail backgrounds are chosen once per visit from Topography, Gradient ASCII, Pattern Waves, Beams, and Aero Shards (when WebGPU is available). The chosen pattern and palette stay fixed until leaving that style.

All production logo, icon, button, and decorative landscape artwork is SVG with vector paths or text. No raster is embedded in those SVGs. The old GLB forest models and pastel backdrop are excluded from the published build.

## Content and provenance

The original source is `D:\notes\vault_1\Art Style Handbook`. The original four content files remain unchanged. The original README is in `source-notes/README.md`, and the earlier compiled reference selection is archived in `data/archive/references-v1.json`.

The user-authorized revision is `data/catalog.json`: 300 distinct named entries. It combines documented web aesthetics, visual design techniques, typography and relevant art influences. Descriptive directions are identified as such instead of being presented as historical art movements. Entries retain source links and legacy IDs where applicable. Historical family metadata remains in the source catalog, but the interface does not group by it.

- `data/research/*-foundations.json`, `ui-experimental.json`, and `art-influences.json`: researched catalog sources.
- `data/research/*-hd-discovered.json`: observed Pinterest source URLs.
- `data/research/*-hd-candidates.json`: measured candidates, not automatically approved.
- `data/research/*-hd-approved.json`: references that passed visual review and native-resolution checks.
- `data/hd-selection.json`: cleared earlier Pinterest selection.
- `data/hd-media-map.json`: historical source-to-MongoDB mapping; these images have been removed.
- `data/collection-policy.json`: current collection, review and migration rules.
- `data/manual-selection.json` and `data/manual-media-map.json`: reviewed replacement collection and verified MongoDB files.
- `data/manual-review.json` and `data/manual-import-report.json`: explicit review decisions and verified import results.
- `data/manual-intake.json`: mapping of the 300 named local folders to stable style IDs.
- `data/references.json` and `data/coverage.csv`: published references and actual coverage.
- `data/reference-removal-report.json`: verified deletion results for both hamanti image archives.
- `data/withdrawn-media.json`: retired image IDs, rejected by the image API.

Pinterest searches use aesthetic names and optional “design” or “aesthetics,” without forcing “UI” onto names such as Frutiger Aero. Native Full HD means at least 1920×1080 or 1080×1920. Small originals are excluded, not enlarged. Images are inspected for relevance; a keyword match alone is insufficient. Casual group photos, selfies and candid people shots are excluded, including photos embedded in collages and layouts. Deliberately posed model/editorial shoots and drawn or painted figures are allowed. The compiler requires an explicit `peopleReview` decision of `no-real-people` or `posed-model`.

Earlier bulk Pinterest collectors remain disabled. On 2026-10-21 the user authorized partial use of the supplied files, then explicitly retained the native Full HD minimum. Of 118 original files across 17 folders, two qualified and were visually approved: one each for Abstract Expressionism and Art Nouveau. They were copied to MongoDB and read back to verify exact checksums and dimensions. The other 116 originals remain untouched in the intake folder. Small index thumbnails are delivery variants of the qualifying originals, not additional references.

The user subsequently authorized exactly two collection agents, `search` and `check`, both GPT-6 Luna at xhigh. They skip folders that originally contained at least six image files and work on the other 288 folders, seeking twelve candidates and retaining at least six reviewed Full HD references per eligible style. The twelve skipped folders are not automatically certified as Full HD. The interface uses six as its current minimum and can display every approved reference, without the earlier eight-image cap. The agents do not migrate data or edit the website.

## Manual image handoff

`D:\3000 reference images` contains 300 subfolders named for the current styles and a short `READ ME.txt`. `scripts/create-image-folders.mjs` creates this layout without overwriting existing files. Optional source links can be saved as `sources.csv` with `filename,url,title` columns inside each style folder.

On 2026-10-21 the user stopped both agents and requested publication of the saved approvals before the full collection was complete. `node scripts/prepare-reviewed-import.mjs` validates the saved checker decisions against the actual source bytes and folder mapping before merging them into `data/manual-review.json`. Only persisted approvals are published; unfinished reviews remain pending. The current merge adds 39 checker-approved images, replaces one lower-resolution copy with its larger original, and retains the original Abstract Expressionism reference: 40 published references across seven styles. Source links, people-photo decisions and review reasons are preserved. Neither agent is running.

Their cumulative ready/review manifests and original folder audit remain under `.tmp/collection-coordination/`. The portable publication approvals are recorded in `data/manual-review.json`.

`scripts/inspect-manual-images.mjs` makes a local dimension inventory and review contact sheets. `node --env-file=.env.local scripts/import-manual-images.mjs` imports only explicitly approved files whose checksum still matches, verifies MongoDB read-back, creates small index thumbnails and rebuilds the published reference data. It is repeatable and never removes intake files. Unattributed user-supplied images do not receive invented Pinterest links.

Keep the intake directory until the user says **“done”**, the accepted images are verified and published, and all remaining rejected or failed files have been resolved. An agent finishing its own collection does not authorize deleting the user's unfinished intake.

The Pinterest collection and migration utilities refuse to run while `data/collection-policy.json` is in manual mode.

## Rebuild the site

```powershell
npm run build
```

Builds do not crawl Pinterest, use AI tools, or connect to MongoDB. The collector and review scripts are manual content-production utilities, not tests.

## MongoDB archive

The `hamanti` database uses the already-existing `wfg` Flex cluster. At the user's request, `scripts/clear-reference-archive.mjs` removed 3,214 image documents from this archive and 2,350 from the earlier Cluster0 hamanti archive, and cleared their reference image fields. Both image collections were verified empty. Other databases were not modified. Local collected image downloads were also removed. No cluster was created or upgraded; image bytes are not committed to GitHub or included in the static bundle.

Store `MONGODB_URI` only in ignored `.env.local` and Vercel's server environment. The read-only `api/images/[id].js` endpoint rejects retired image IDs with HTTP 410 and no-store caching. The GitHub Pages site uses the same image API.

The current manual import retains original bytes and dimensions, with separate WebP thumbnails for the index. Originals exceeding the 4.3 MB delivery budget are archived separately and served through a lossless WebP variant at the same native dimensions. If even that variant exceeds the delivery budget, the reference remains pending. The manual importer uses a 4,000 MB ceiling for `wfg`; historical migration tools default to a conservative 280 MB ceiling for older free clusters. Capacity failures remain pending instead of silently changing plans or removing older data.

## Design assets

`public/ui/` contains SVGs for the outlined Syne h, imperfect seven-point star, arrow, search icon, and button states. These implement the Canva component direction. The font glyph is preserved as an outline; the star has deliberately unequal points.

`scripts/create-ui-vectors.py` regenerates the SVG controls with Python, fontTools and Brotli. Earlier Blender authoring files remain in the repository for history, but are not used by the current site. `scripts/prepare-shanshui.mjs` extracts the drawing algorithms from the preserved upstream source during each build and copies the license. `vendor/shan-shui-inf/ADAPTATION.md` documents the integration.

## Deployment

GitHub Pages builds and publishes `dist/` on pushes to `main`. Vercel serves the app and image endpoint. Production needs the existing `MONGODB_URI` secret.

Strongly recommended: install the Vercel CLI with `npm i -g vercel` for `vercel env pull`, `vercel deploy`, and `vercel logs`.

```powershell
vercel deploy --prod
```

Keep `hamanti.vercel.app` attached as the Vercel production domain because the image URLs use it.

## Credits and verification

Official React Bits components and their MIT + Commons Clause license are in `vendor/react-bits/`. Shan Shui Inf and its MIT license are in `vendor/shan-shui-inf/`. Font licenses ship with the site. Motion example interactions are independently implemented; restricted Motion+ code is not included. Canva assets and the shan shui landscape are interface decoration, never art-style reference examples.

The user authorized tests on 2026-10-21. Run `npm test` for the native-dimension, visual-review, storage-verification, source-link, duplicate and catalog/search regressions. Browser checks also cover desktop/mobile layout, seven-card geometry, keyboard navigation, filtering, the modal image view, motion pause and long-distance landscape navigation. Earlier work predating this authorization used builds and manual inspection only.

## Opening preparation

The initial `hamanti` wordmark fills from left to right as the opening view is prepared, inspired by [Motion's fill-text example](https://motion.dev/examples/react-loading-fill-text). The app warms the available cover thumbnails for the first 120 alphabetically ordered styles (40% of 300), prioritizes the current search/detail route, loads the typography, and waits for the first decoded landscape. Galleries remain on demand. Four concurrent image requests and selective decoding keep preparation bounded.

Progress reflects completed preparation tasks rather than a timer. Visitors can enter after six seconds if optional assets are still loading; optional preparation ends after twelve seconds and failed assets do not trap the page. Reduced-motion and saved pause preferences disable the fill/fade animation. The loader is shown once per document load, not on internal navigation. Original image quality and collection rules are unchanged.
