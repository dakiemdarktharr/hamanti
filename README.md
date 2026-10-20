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

Open http://localhost:4173. The existing HTML, CSS, and browser JavaScript stack is bundled with esbuild. Motion and Lenis provide transitions and scrolling. A small React island hosts the official React Bits backgrounds. Three.js renders the Blender forest models. The local static preview reads images from the deployed MongoDB API.

## Interface

The index uses three image cards per desktop row, two on smaller screens, and one on narrow phones. Cards show an image, name and coverage; descriptions stay in the detail view. The framed search bar uses a large serif input and compact family/coverage filters. Search includes names, aliases, descriptions and tags, tolerates a single-letter typo in longer words, and has a clear control, slash shortcut, and keyboard access to results.

The procedural forest recycles a viewport-sized scene with trees, ferns, rocks, birds, butterflies, clouds, foxes and deer. Sage foliage, clay wildlife and powder-blue clouds have matte, procedural pastel brush texture. A gently drifting SVG landscape adds broad, broken pigment strokes behind them. Both layers stay behind readable cards, render only while the index is visible, and respect reduced motion and the pause control.

The introduction starts revealing only after each word's line reaches the viewport centre. Reference images occupy most of the viewport; selecting one opens a larger, scrollable view. Detail backgrounds are chosen once per visit from Topography, Gradient ASCII, Pattern Waves, Beams, and Aero Shards (when WebGPU is available). The chosen pattern and palette stay fixed until leaving that style.

All production logo, icon, button, and decorative UI artwork is SVG with vector paths or text. No raster is embedded in those SVGs. Reference photographs retain their native pixel dimensions in WebP delivery files; 3D meshes use GLB.

## Content and provenance

The original source is `D:\notes\vault_1\Art Style Handbook`. The original four content files remain unchanged. The original README is in `source-notes/README.md`, and the earlier compiled reference selection is archived in `data/archive/references-v1.json`.

The user-authorized revision is `data/catalog.json`: 300 distinct named entries in 17 families. It combines documented web aesthetics, visual design techniques, typography and relevant art influences. Descriptive directions are identified as such instead of being presented as historical art movements. Entries retain source links and legacy IDs where applicable.

- `data/research/*-foundations.json`, `ui-experimental.json`, and `art-influences.json`: researched catalog sources.
- `data/research/*-hd-discovered.json`: observed Pinterest source URLs.
- `data/research/*-hd-candidates.json`: measured candidates, not automatically approved.
- `data/research/*-hd-approved.json`: references that passed visual review and native-resolution checks.
- `data/hd-selection.json`: at most eight approved references per current category.
- `data/hd-media-map.json`: public source-to-MongoDB mapping and measured dimensions.
- `data/references.json` and `data/coverage.csv`: published references and actual coverage.
- `data/hd-migration-report.json`: storage results and any blocked uploads.

Pinterest searches use aesthetic names and optional “design” or “aesthetics,” without forcing “UI” onto names such as Frutiger Aero. Native Full HD means at least 1920×1080 or 1080×1920. Small originals are excluded, not enlarged. Images are inspected for relevance; a keyword match alone is insufficient. Casual group photos, selfies and candid people shots are excluded, including photos embedded in collages and layouts. Deliberately posed model/editorial shoots and drawn or painted figures are allowed. The compiler requires an explicit `peopleReview` decision of `no-real-people` or `posed-model`.

Pin links lead to individual Pinterest pages; board and idea links are labelled as collections. A board owner is not automatically the artwork's creator. Images belong to their respective creators. Fewer than eight reviewed, stored images is explicitly shown as “Examples pending.” Collection is incomplete; the coverage file records the precise shortfall.

## Rebuild the revised content

```powershell
node scripts/assemble-catalog.mjs
node scripts/prepare-hd-selection.mjs
node --env-file=.env.local scripts/migrate-hd-images.mjs --capacity-mb=4000
npm run build
```

Builds do not crawl Pinterest, use AI tools, or connect to MongoDB. The collector and review scripts are manual content-production utilities, not tests.

## MongoDB archive

The `hamanti` database now uses the already-existing `wfg` Flex cluster's 5 GB allocation. It contains `images`, `references_legacy`, and the revised `references_v3`. `scripts/copy-legacy-archive.mjs` copied the earlier archive from Cluster0 while preserving IDs. No cluster was created or upgraded; Cluster0 and its other databases remain intact. Image bytes are not committed to GitHub or included in the static bundle.

Store `MONGODB_URI` only in ignored `.env.local` and Vercel's server environment. The read-only `api/images/[id].js` endpoint serves stored IDs with immutable caching. The GitHub Pages site uses the same image API.

Native dimensions are retained while delivery files are encoded as WebP. Files exceeding Vercel's response limit are excluded. Use the explicit 4,000 MB migration ceiling for `wfg`; the script defaults to a conservative 280 MB ceiling for older free-cluster setups. Capacity failures remain pending instead of silently changing plans or removing older data.

## Design assets

`public/ui/` contains SVGs for the outlined Syne h, imperfect seven-point star, arrow, search icon, and button states. These implement the Canva component direction. The font glyph is preserved as an outline; the star has deliberately unequal points.

`scripts/create-ui-vectors.py` regenerates the SVGs with Python, fontTools and Brotli. `scripts/create-forest-assets.py` regenerates the original GLB assets in Blender. Neither is required for normal website builds.

## Deployment

GitHub Pages builds and publishes `dist/` on pushes to `main`. Vercel serves the app and image endpoint. Production needs the existing `MONGODB_URI` secret.

Strongly recommended: install the Vercel CLI with `npm i -g vercel` for `vercel env pull`, `vercel deploy`, and `vercel logs`.

```powershell
vercel deploy --prod
```

Keep `hamanti.vercel.app` attached as the Vercel production domain because the image URLs use it.

## Credits and verification

Official React Bits components and their MIT + Commons Clause license are in `vendor/react-bits/`. Font licenses ship with the site. Motion example interactions are independently implemented; restricted Motion+ code is not included. Canva and Blender assets are interface decoration, never art-style reference examples.

Builds and manual browser inspection only. No tests were added or run, as requested.
