# 2026-10-21 — fill-text opening screen

- Added a green `hamanti` text-fill loader driven by real font, landscape and image preparation.
- Preloads available thumbnails for the first 120 styles (40%), with current-route images first and at most four requests at once. Full galleries remain on demand.
- Waits for the first decoded shan shui image before the initial reveal; unlocks scrolling and keyboard controls together.
- Supports reduced motion, a six-second Enter now option, a twelve-second optional-resource limit and a readable content-error fallback.
- Added three regression tests for asset selection, request limits, failed downloads and cancellation. Checked home/index transitions, direct gallery entry and slow/error responses in the browser.

Changed files: `app.js`, `index.html`, `lib/loading.js`, `lib/loading.css`, `lib/preload.js`, `lib/handbook.js`, `lib/shanshui.js`, `tests/preload.test.mjs`, `README.md`, `CHANGES.md`.

---

# 2026-10-21 — smoother handscroll and curved cards

- Single horizontal row with seven complete cards on desktop; perspective increases toward the sides. Tablets show five and phones show a readable card with a neighbouring preview.
- Only the nearby cards receive transform updates. Offscreen contents skip painting.
- The shan shui generator remains in a worker. Its output is decoded ahead of the viewport, moved as one image layer, and replaced only when the next view is ready. No live SVG path tree is repainted on each scroll.
- Production HTML is not cached, so updated image-loading permissions take effect with deployments. Landscape failures now identify the failing stage.
- Restored actual spaces between introduction words, increased line spacing and loosened the detail descriptions.
- Improved single-image galleries, source-link handling, singular counts, numerical search, keyboard navigation and thumbnail delivery.
- Two qualifying user images copied to MongoDB with original bytes and dimensions verified. All 118 original intake files retained. The newly authorized two-agent collection is separate and still in progress.
- Seven regression cases and desktop/mobile browser checks. The Pages build now runs the regression suite before publishing.

## Changed files

- `app.js`
- `lib/horizontal.css`
- `lib/shanshui.js`
- `public/shan-shui/worker.js`
- `lib/search.js`
- `lib/handbook.js`
- `server.mjs`
- `vercel.json`
- `sources.html`
- `scripts/compile-catalog.mjs`
- `scripts/import-manual-images.mjs`
- `scripts/inspect-manual-images.mjs`
- `data/collection-policy.json`
- `data/manual-intake.json`
- `data/manual-review.json`
- `data/manual-selection.json`
- `data/manual-media-map.json`
- `data/manual-import-report.json`
- `data/references.json`
- `data/coverage.csv`
- `tests/catalog.test.mjs`
- `package.json`
- `.github/workflows/pages.yml`
- `vendor/shan-shui-inf/ADAPTATION.md`
- `README.md`
- `CHANGES.md`

---

# hamanti — horizontal shan shui revision

- Removed the flower graphic and its garden code/styles from the home screen.
- Changed the home page to a horizontal handscroll, from title and introduction through the A–Z index to credits. Wheel, trackpad, touch and keyboard navigation remain available; reduced-motion mode uses instant navigation.
- Kept search and first-letter filtering visible while browsing horizontally. Search results, stable detail links and return positions are preserved.
- Replaced the 3D forest with Lingdong Huang's `shan-shui-inf` SVG generator, pinned to commit `9f754d2b2e73495db7883d4d4055a7b0903b0454`. Its MIT license and upstream source are retained.
- Isolated the generator in a Web Worker and bounded its terrain cache. The ink uses the logo's dark green, `#222a20`, on `#e9ebe2` paper. Old GLB models and the painted backdrop are excluded from the deployed site.
- Left the manual image collection and its 300 folders unchanged.
- Production build and manual desktop/mobile review of navigation, filtering, detail return and paused motion. No tests added or run.

## Files changed in this revision

- `app.js`, `index.html`, `styles.css`, `sources.html`
- `lib/horizontal.css`, `lib/shanshui.js`; removed `lib/garden.js`
- `public/shan-shui/worker.js`
- `scripts/build.mjs`, `scripts/prepare-shanshui.mjs`
- `vendor/shan-shui-inf/index.html`, `vendor/shan-shui-inf/LICENSE`, `vendor/shan-shui-inf/README.md`, `vendor/shan-shui-inf/ADAPTATION.md`
- `README.md`, `CHANGES.md`

---

# Earlier manual collection revision — 20 October 2026

- Removed all reference image documents from both hamanti MongoDB archives and cleared local collected downloads. The live catalog now contains zero reference images; retired image IDs return HTTP 410.
- Stopped Pinterest collection and guarded the previous collectors/migrators against restoring the withdrawn archive.
- Replaced the home screen's formal caption and circular arrows with a handwritten invitation, drawn path arrows, and an interactive procedural SVG flower garden.
- Added irregular soil patches, grass and paths beneath the trees, ferns and rocks; ground animals follow a shared trail.
- Replaced the fixed cloud model with rounded procedural clouds that vary in size, shape and puff count.
- Removed family sections and filters. All 300 styles appear in one A–Z index, with a first-letter filter and alphabetical next-style navigation.
- Created `D:\3000 reference images` and 300 named subfolders. The collection waits for the user to say “done.” Import verification must finish before this folder is removed.
- Production build and manual desktop/mobile browser review only; no tests added or run.

## Files changed in this revision

- `README.md`, `CHANGES.md`
- `app.js`, `index.html`, `sources.html`, `styles.css`
- `lib/garden.js`, `lib/terrain.js`, `lib/forest.js`, `lib/pastel.js`
- `api/images/[id].js`
- `data/collection-policy.json`, `data/manual-intake.json`, `data/manual-selection.json`, `data/manual-media-map.json`
- `data/coverage.csv`, `data/references.json`, `data/hd-selection.json`
- `data/reference-removal-report.json`, `data/withdrawn-media.json`
- `scripts/clear-reference-archive.mjs`, `scripts/create-image-folders.mjs`, `scripts/pinterest-policy.mjs`
- `scripts/compile-catalog.mjs`, `scripts/prepare-hd-selection.mjs`
- `scripts/collect-art-hd.mjs`, `scripts/collect-experimental-hd.mjs`, `scripts/collect-foundations-hd.mjs`
- `scripts/migrate-hd-images.mjs`, `scripts/migrate-images.mjs`, `scripts/copy-legacy-archive.mjs`
- Outside the repository: `D:\3000 reference images\READ ME.txt` and 300 empty style folders.

---

# Earlier revision — 20 October 2026

## Interface

- Three-column image index; card descriptions removed while detail descriptions remain.
- Framed serif search input, compact family and coverage filters, keyboard shortcuts and typo-tolerant search.
- Procedural Blender woodland with pastel pigment shaders and a drifting painted SVG backdrop.
- SVG h/star logo with irregular rays, SVG icons and button assets, and a saved Canva component sheet.
- Larger reference previews and a scrollable full-image viewer.
- Five reference backgrounds, one fixed choice and palette per visit; reduced-motion and pause support.
- Introduction reveals only when its text reaches the viewport centre.

## Collection and storage

- Revised 300-entry web/interface aesthetic catalog with documented sources; original Obsidian files preserved.
- Native Full HD measurements, visual relevance review, and explicit photo review. Deliberately posed model/editorial imagery is allowed; casual group photos, selfies and candid people shots are excluded.
- Images stored in the existing wfg Flex cluster. Cluster0 and its other databases remain intact; no plan upgrade or new cluster.
- Published collection: 997 native Full HD reference slots across 300 categories; 42 complete, 182 partial, 76 without references. The eight-per-category target remains incomplete. Discovery is paused, not exhausted.
- Secrets remain in ignored local environment files and Vercel's server environment.

## Verification

Production build and manual browser review of desktop/mobile layout, search, image viewing, navigation, motion controls and graphics. No tests added or run.

## Files changed

- `app.js`
- `CHANGES.md`
- `data/archive-copy-report.json`
- `data/archive/references-v1.json`
- `data/catalog.json`
- `data/coverage.csv`
- `data/design-assets.json`
- `data/hd-media-map.json`
- `data/hd-migration-report.json`
- `data/hd-selection.json`
- `data/references.json`
- `data/research/art-hd-additional-pages.json`
- `data/research/art-hd-approved.json`
- `data/research/art-hd-candidates.json`
- `data/research/art-hd-coverage.json`
- `data/research/art-hd-discovered.json`
- `data/research/art-hd-empty-pages.json`
- `data/research/art-hd-empty-searches.json`
- `data/research/art-hd-extra-searches.json`
- `data/research/art-hd-final-pages.json`
- `data/research/art-hd-final-sources.json`
- `data/research/art-hd-last-pages.json`
- `data/research/art-hd-measurements.json`
- `data/research/art-hd-report.json`
- `data/research/art-hd-tasks.json`
- `data/research/art-influences.json`
- `data/research/art-visual-review.json`
- `data/research/experimental-final-report.json`
- `data/research/experimental-hd-approved.json`
- `data/research/experimental-hd-candidates.json`
- `data/research/experimental-hd-discovered.json`
- `data/research/experimental-hd-parent-approved.json`
- `data/research/experimental-hd-report.json`
- `data/research/experimental-parent-people-rejected.json`
- `data/research/experimental-people-rejected.json`
- `data/research/experimental-pinterest-followups.json`
- `data/research/experimental-pinterest-searches.json`
- `data/research/foundations-cached-final-review.json`
- `data/research/foundations-hd-approved.json`
- `data/research/foundations-hd-candidates.json`
- `data/research/foundations-hd-coverage.json`
- `data/research/foundations-hd-discovered.json`
- `data/research/foundations-hd-measured.json`
- `data/research/foundations-hd-report.json`
- `data/research/foundations-hd-review.json`
- `data/research/foundations-people-review.json`
- `data/research/hd-acquisition.md`
- `data/research/hd-audit.json`
- `data/research/hd-original-probe.json`
- `data/research/pinterest-art-searches/1.json`
- `data/research/pinterest-art-searches/10.json`
- `data/research/pinterest-art-searches/11.json`
- `data/research/pinterest-art-searches/12.json`
- `data/research/pinterest-art-searches/13.json`
- `data/research/pinterest-art-searches/131.json`
- `data/research/pinterest-art-searches/133.json`
- `data/research/pinterest-art-searches/136.json`
- `data/research/pinterest-art-searches/139.json`
- `data/research/pinterest-art-searches/142.json`
- `data/research/pinterest-art-searches/143.json`
- `data/research/pinterest-art-searches/144.json`
- `data/research/pinterest-art-searches/145.json`
- `data/research/pinterest-art-searches/146.json`
- `data/research/pinterest-art-searches/147.json`
- `data/research/pinterest-art-searches/149.json`
- `data/research/pinterest-art-searches/152.json`
- `data/research/pinterest-art-searches/156.json`
- `data/research/pinterest-art-searches/167.json`
- `data/research/pinterest-art-searches/168.json`
- `data/research/pinterest-art-searches/170.json`
- `data/research/pinterest-art-searches/175.json`
- `data/research/pinterest-art-searches/176.json`
- `data/research/pinterest-art-searches/177.json`
- `data/research/pinterest-art-searches/178.json`
- `data/research/pinterest-art-searches/179.json`
- `data/research/pinterest-art-searches/18.json`
- `data/research/pinterest-art-searches/180.json`
- `data/research/pinterest-art-searches/181.json`
- `data/research/pinterest-art-searches/182.json`
- `data/research/pinterest-art-searches/183.json`
- `data/research/pinterest-art-searches/184.json`
- `data/research/pinterest-art-searches/185.json`
- `data/research/pinterest-art-searches/186.json`
- `data/research/pinterest-art-searches/187.json`
- `data/research/pinterest-art-searches/188.json`
- `data/research/pinterest-art-searches/189.json`
- `data/research/pinterest-art-searches/19.json`
- `data/research/pinterest-art-searches/190.json`
- `data/research/pinterest-art-searches/194.json`
- `data/research/pinterest-art-searches/195.json`
- `data/research/pinterest-art-searches/196.json`
- `data/research/pinterest-art-searches/197.json`
- `data/research/pinterest-art-searches/198.json`
- `data/research/pinterest-art-searches/199.json`
- `data/research/pinterest-art-searches/2.json`
- `data/research/pinterest-art-searches/20.json`
- `data/research/pinterest-art-searches/200.json`
- `data/research/pinterest-art-searches/201.json`
- `data/research/pinterest-art-searches/202.json`
- `data/research/pinterest-art-searches/203.json`
- `data/research/pinterest-art-searches/204.json`
- `data/research/pinterest-art-searches/206.json`
- `data/research/pinterest-art-searches/207.json`
- `data/research/pinterest-art-searches/21.json`
- `data/research/pinterest-art-searches/211.json`
- `data/research/pinterest-art-searches/212.json`
- `data/research/pinterest-art-searches/213.json`
- `data/research/pinterest-art-searches/214.json`
- `data/research/pinterest-art-searches/215.json`
- `data/research/pinterest-art-searches/22.json`
- `data/research/pinterest-art-searches/23.json`
- `data/research/pinterest-art-searches/24.json`
- `data/research/pinterest-art-searches/25.json`
- `data/research/pinterest-art-searches/26.json`
- `data/research/pinterest-art-searches/27.json`
- `data/research/pinterest-art-searches/28.json`
- `data/research/pinterest-art-searches/29.json`
- `data/research/pinterest-art-searches/30.json`
- `data/research/pinterest-art-searches/31.json`
- `data/research/pinterest-art-searches/32.json`
- `data/research/pinterest-art-searches/34.json`
- `data/research/pinterest-art-searches/35.json`
- `data/research/pinterest-art-searches/36.json`
- `data/research/pinterest-art-searches/4.json`
- `data/research/pinterest-art-searches/5.json`
- `data/research/pinterest-art-searches/6.json`
- `data/research/pinterest-art-searches/7.json`
- `data/research/pinterest-art-searches/8.json`
- `data/research/pinterest-art-searches/9.json`
- `data/research/removed-design-systems.json`
- `data/research/ui-experimental.json`
- `data/research/ui-foundations-notes.md`
- `data/research/ui-foundations-rename-map.json`
- `data/research/ui-foundations.json`
- `favicon.svg`
- `index.html`
- `lib/background.jsx`
- `lib/forest.js`
- `lib/handbook.js`
- `lib/pastel.js`
- `lib/search.js`
- `package-lock.json`
- `package.json`
- `public/models/birch.glb`
- `public/models/bird.glb`
- `public/models/butterfly.glb`
- `public/models/cloud.glb`
- `public/models/deer.glb`
- `public/models/fern.glb`
- `public/models/fox.glb`
- `public/models/pine.glb`
- `public/models/rock.glb`
- `public/ui/button-default.svg`
- `public/ui/button-focus.svg`
- `public/ui/button-hover.svg`
- `public/ui/button-pressed.svg`
- `public/ui/canva-arrow.svg`
- `public/ui/imperfect-star.svg`
- `public/ui/logo.svg`
- `public/ui/pastel-landscape.svg`
- `public/ui/search.svg`
- `README.md`
- `scripts/archive-capacity.mjs`
- `scripts/assemble-catalog.mjs`
- `scripts/build.mjs`
- `scripts/collect-art-hd.mjs`
- `scripts/collect-experimental-hd.mjs`
- `scripts/collect-foundations-hd.mjs`
- `scripts/compile-catalog.mjs`
- `scripts/compile-content.mjs`
- `scripts/copy-legacy-archive.mjs`
- `scripts/create-forest-assets.py`
- `scripts/create-ui-vectors.py`
- `scripts/inspect-hd.mjs`
- `scripts/migrate-hd-images.mjs`
- `scripts/prepare-hd-selection.mjs`
- `scripts/report-art-coverage.mjs`
- `scripts/review-art-contact-sheets.mjs`
- `scripts/review-contact-sheets.mjs`
- `scripts/review-foundations-hd.mjs`
- `scripts/review-foundations-people.mjs`
- `sources.html`
- `styles.css`
- `vendor/react-bits/AeroShards.css`
- `vendor/react-bits/AeroShards.jsx`
- `vendor/react-bits/Beams.css`
- `vendor/react-bits/Beams.jsx`
- `vendor/react-bits/GradientASCII.css`
- `vendor/react-bits/GradientASCII.jsx`
- `vendor/react-bits/PatternWaves.css`
- `vendor/react-bits/PatternWaves.jsx`
