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

Open http://localhost:4173. The existing HTML, CSS, and browser JavaScript stack is bundled with esbuild. Motion and Lenis provide transitions and scrolling. A small React island hosts the official React Bits backgrounds. Three.js renders the Blender forest models and procedural terrain.

## Interface

The index is one alphabetical A–Z list, with three cards per desktop row, two on smaller screens, and one on narrow phones. There are no family sections. Empty cards show the style name and an honest “Images to come” state; descriptions stay in the detail view. The framed search bar uses a large serif input and a first-letter filter. Search includes names, aliases, descriptions and tags, tolerates a single-letter typo in longer words, and has a clear control, slash shortcut, and keyboard access to results. Stable style IDs preserve existing detail URLs; displayed numbers and next-style navigation follow alphabetical order.

The home screen invites readers to “Follow what catches your eye.” Hand-drawn SVG arrows lead into the index, and clicking or keyboard-activating the small SVG garden grows a different arrangement of flowers.

The procedural forest recycles a viewport-sized scene with trees, ferns, rocks, birds, butterflies, clouds, foxes and deer. Each plant or rock sits on an irregular soil island with a winding path and grass. Ground animals follow a shared trail. Clouds are built at runtime from overlapping rounded volumes, varying their width, height, puff count and overall size. Sage foliage, clay wildlife and soft pale clouds have matte pastel pigment. A gently drifting SVG landscape adds broad, broken brush strokes behind them. Both layers stay behind readable cards, render only while the index is visible, and respect reduced motion and the pause control.

The introduction starts revealing only after each word's line reaches the viewport centre. Reference images occupy most of the viewport; selecting one opens a larger, scrollable view. Detail backgrounds are chosen once per visit from Topography, Gradient ASCII, Pattern Waves, Beams, and Aero Shards (when WebGPU is available). The chosen pattern and palette stay fixed until leaving that style.

All production logo, icon, button, and decorative UI artwork is SVG with vector paths or text. No raster is embedded in those SVGs. Reference photographs retain their native pixel dimensions in WebP delivery files; 3D meshes use GLB.

## Content and provenance

The original source is `D:\notes\vault_1\Art Style Handbook`. The original four content files remain unchanged. The original README is in `source-notes/README.md`, and the earlier compiled reference selection is archived in `data/archive/references-v1.json`.

The user-authorized revision is `data/catalog.json`: 300 distinct named entries. It combines documented web aesthetics, visual design techniques, typography and relevant art influences. Descriptive directions are identified as such instead of being presented as historical art movements. Entries retain source links and legacy IDs where applicable. Historical family metadata remains in the source catalog, but the interface does not group by it.

- `data/research/*-foundations.json`, `ui-experimental.json`, and `art-influences.json`: researched catalog sources.
- `data/research/*-hd-discovered.json`: observed Pinterest source URLs.
- `data/research/*-hd-candidates.json`: measured candidates, not automatically approved.
- `data/research/*-hd-approved.json`: references that passed visual review and native-resolution checks.
- `data/hd-selection.json`: cleared earlier Pinterest selection.
- `data/hd-media-map.json`: historical source-to-MongoDB mapping; these images have been removed.
- `data/collection-policy.json`: manual collection policy and the user’s “done” upload trigger.
- `data/manual-selection.json` and `data/manual-media-map.json`: currently empty inputs for the replacement collection.
- `data/manual-intake.json`: mapping of the 300 named local folders to stable style IDs.
- `data/references.json` and `data/coverage.csv`: published references and actual coverage.
- `data/reference-removal-report.json`: verified deletion results for both hamanti image archives.
- `data/withdrawn-media.json`: retired image IDs, rejected by the image API.

Pinterest searches use aesthetic names and optional “design” or “aesthetics,” without forcing “UI” onto names such as Frutiger Aero. Native Full HD means at least 1920×1080 or 1080×1920. Small originals are excluded, not enlarged. Images are inspected for relevance; a keyword match alone is insufficient. Casual group photos, selfies and candid people shots are excluded, including photos embedded in collages and layouts. Deliberately posed model/editorial shoots and drawn or painted figures are allowed. The compiler requires an explicit `peopleReview` decision of `no-real-people` or `posed-model`.

Automated Pinterest collection is stopped. Earlier research files and source links are historical records, not active image selections. The published collection currently contains **zero reference images**. All 300 styles are pending while the user prepares a replacement collection.

## Manual image handoff

`D:\3000 reference images` contains 300 subfolders named for the current styles and a short `READ ME.txt`. `scripts/create-image-folders.mjs` creates this layout without overwriting existing files. Optional source links can be saved as `sources.csv` with `filename,url,title` columns inside each style folder.

Wait until the user says **“done”**. Then inspect the supplied files for native Full HD resolution, relevance and the people-photo policy, import the accepted files into MongoDB, and publish the updated catalog. The import step must be adapted to the actual supplied files; it is not a background watcher. Verify stored checksums, dimensions, counts and live delivery before removing the intake directory. Resolve failed or unsuitable files first so cleanup never silently discards unimported work.

The Pinterest collection and migration utilities refuse to run while `data/collection-policy.json` is in manual mode.

## Rebuild the site

```powershell
npm run build
```

Builds do not crawl Pinterest, use AI tools, or connect to MongoDB. The collector and review scripts are manual content-production utilities, not tests.

## MongoDB archive

The `hamanti` database uses the already-existing `wfg` Flex cluster. At the user's request, `scripts/clear-reference-archive.mjs` removed 3,214 image documents from this archive and 2,350 from the earlier Cluster0 hamanti archive, and cleared their reference image fields. Both image collections were verified empty. Other databases were not modified. Local collected image downloads were also removed. No cluster was created or upgraded; image bytes are not committed to GitHub or included in the static bundle.

Store `MONGODB_URI` only in ignored `.env.local` and Vercel's server environment. The read-only `api/images/[id].js` endpoint rejects retired image IDs with HTTP 410 and no-store caching. The GitHub Pages site uses the same image API.

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
