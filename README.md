# hamanti

A visual handbook of 300 web and interface aesthetics, typographic directions, and art influences.

- Website: https://hamanti.vercel.app
- Public repository: https://github.com/dakiemdarktharr/hamanti
- Canva component sheet: https://canva.link/gs5kjbknzcrey7w

## Run locally

Requires Node.js 24.x, matching the package engine and GitHub Actions workflow.

```powershell
npm ci
npm run dev
```

Open http://localhost:4173. For another port, set `$env:PORT = 4180` before starting the server. HTML, CSS and browser JavaScript are bundled with esbuild. Motion and Lenis provide navigation and scrolling; Three.js renders the hands over the existing HTML category cards. Lingdong Huang's Shan Shui Inf generates the landscape in a worker.

## Latest update: five cards and scroll-driven hands

The normal index now includes two cel-shaded hands with broad white sleeves. No preview flag is needed. Add `?preview=hands` before the hash, for example `http://localhost:4173/?preview=hands#/index`, to enable the nine-second review player and the 0–540 frame scrubber. Those controls are absent from normal visits.

- Five cards begin stacked in the center. Scrolling raises the hands, grips the packet and spreads it into a fan. Reversing scroll retraces the sequence.
- Alternating thumb pressure follows the category cards' actual transforms. Incoming and outgoing decks retain their positions. The lower deck starts empty, fills after completed deposits, and stops growing at four cards.
- Both printed faces flip together. Engraved hamanti backs, paper grain, discolored edges and scuffs give the cards a used appearance. Hover and focus preserve the grip's geometry and stacking order.
- The loading title develops from pencil outlines, construction lines, graphite smears and erased marks into a finished serif nameplate. Loading ends only after the full landscape is prepared for all 300 categories.
- Home and category navigation hold the current cards and fingers while the cover closes. The destination commits under the full cover, preventing the home-title flash. The former home caption has been removed.

See the [implementation notes](docs/hand-category-preview.md), [correction audit](demos/correction-audit/AUDIT.md), [corrected hand demo](demos/correction-audit/final/corrected-hands.mp4), and [sketch-to-print time-lapse](demos/correction-audit/final/sketch-to-print-timelapse.mp4).

## Interface

The home page is one horizontal handscroll: title, introduction, alphabetical A–Z index and closing credits. Wheel and trackpad gestures move sideways; touch uses native horizontal swiping. Arrow keys, Page Up/Down, Home/End and previous/next controls offer keyboard navigation. Reduced-motion mode keeps the same navigation without smoothing. The reference detail pages retain their readable vertical layout and gallery.

The index uses five main fan positions on desktop, tablet and phone layouts, with separate edge transfers to the upper-right and lower-left decks. Only nearby cards receive transform updates. Search, first-letter filtering and navigation stay visible. There are no family sections. Empty cards show a typographic placeholder and “Images pending”; descriptions stay in the detail view. Search includes names, aliases, descriptions and tags, tolerates a single-letter typo in longer words, and has a clear control and slash shortcut. Stable style IDs preserve existing detail URLs; displayed numbers and next-style navigation follow alphabetical order. The [October 23 fan review](docs/card-fan-2026-10-23.md) records the earlier layout; the latest five-card behavior is documented above.

The flower graphic and 3D woodland have been replaced. Hand-drawn arrows lead right through the page, while a shan shui landscape extends behind the introduction and index. The generator is from https://github.com/LingDong-/shan-shui-inf, pinned at `9f754d2b2e73495db7883d4d4055a7b0903b0454`, with its MIT license and attribution retained. Its legacy globals and seeded random generator are isolated in a classic Web Worker. All ink uses the logo's `#222a20`, with wash opacity preserved on `#e9ebe2` paper. Scenery follows scrolling; it does not move on its own.

The complete landscape is rasterized into decoded tiles before the loader closes. A 96 MiB pixel budget bounds the cache; scrolling and distant navigation attach already prepared canvases instead of generating missing scenery. Resize maps the new scroll range onto the cache. Temporary object URLs are revoked after decoding.

The introduction starts revealing each word only after it passes the viewport's horizontal centre. Spaces sit outside the word spans, with generous line spacing; geometry is read before opacity updates. Reference images occupy most of the viewport; selecting one opens a larger, scrollable view. Single-image collections use the full gallery width. Detail backgrounds are chosen once per visit from small SVG topography, ASCII, wave, beam and flat-shard patterns. The pattern and palette stay fixed until leaving that style. Full-size gallery images load around the active reference; distant cards use thumbnails.

The October 21 interaction pass added a keyboard-operated image viewer with previous/next and retry states, filter and scroll restoration through browser history, system reduced-motion precedence, invalid-route recovery, and stable card positions when resizing. Gallery portraits fit without cropping. Worker-side SVG contour compaction reduces landscape preparation work. See [the earlier interaction audit](docs/interaction-audit-2026-10-21.md) for its checked flows; the latest loader keeps the finished masthead intact without a typing caret.

Logos, icons, arrows and card-back artwork use SVG. The only 3D runtime asset is the hand-only GLB: two anatomical rigs with skin, nails and broad white sleeves. It contains no card meshes, artwork or textures. The website's existing HTML links remain the category cards. See [hand asset provenance and export instructions](public/hands/README.md).

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

Pinterest searches use aesthetic names and optional “design” or “aesthetics,” without forcing “UI” onto names such as Frutiger Aero. Images are inspected for relevance; a keyword match alone is insufficient. Casual group photos, selfies and candid people shots are excluded, including photos embedded in collages and layouts. Deliberately posed model/editorial shoots and drawn or painted figures are allowed. The compiler requires an explicit `peopleReview` decision of `no-real-people` or `posed-model`.

The user removed the native Full HD requirement for files saved in `D:\3000 reference images` on October 21. Reviewed folder images can now publish at their original resolution, including JPEG, PNG, WebP and AVIF. The importer verifies the actual folder path, source checksum and MongoDB read-back; the compiler permits smaller images only when both their selection and stored-media records confirm this intake verification. External collections retain their original Full HD policy. Published `nativeFullHD` flags describe actual dimensions; the interface makes no blanket Full HD claim.

Earlier bulk Pinterest collectors remain disabled. On 2026-10-21 the user authorized partial use of the supplied files, then explicitly retained the native Full HD minimum. Of 118 original files across 17 folders, two qualified and were visually approved: one each for Abstract Expressionism and Art Nouveau. They were copied to MongoDB and read back to verify exact checksums and dimensions. The other 116 originals remain untouched in the intake folder. Small index thumbnails are delivery variants of the qualifying originals, not additional references.

The user subsequently authorized exactly two collection agents, `search` and `check`, both GPT-6 Luna at xhigh. They skip folders that originally contained at least six image files and work on the other 288 folders, seeking twelve candidates and retaining at least six reviewed Full HD references per eligible style. The twelve skipped folders are not automatically certified as Full HD. The interface uses six as its current minimum and can display every approved reference, without the earlier eight-image cap. The agents do not migrate data or edit the website.

## Manual image handoff

`D:\3000 reference images` contains 300 subfolders named for the current styles and a short `READ ME.txt`. `scripts/create-image-folders.mjs` creates this layout without overwriting existing files. Optional source links can be saved as `sources.csv` with `filename,url,title` columns inside each style folder.

On 2026-10-21 the user stopped both agents and requested publication of the saved approvals before the full collection was complete. `node scripts/prepare-reviewed-import.mjs` validates the saved checker decisions against the actual source bytes and folder mapping before merging them into `data/manual-review.json`. Only persisted approvals are published; unfinished reviews remain pending. The current merge adds 39 checker-approved images, replaces one lower-resolution copy with its larger original, and retains the original Abstract Expressionism reference: 40 published references across seven styles. Source links, people-photo decisions and review reasons are preserved. Neither agent is running.

Their cumulative ready/review manifests and original folder audit remain under `.tmp/collection-coordination/`. The portable publication approvals are recorded in `data/manual-review.json`. A subsequent user-requested folder review added 22 native Full HD images, bringing publication to 62 references across 11 styles. `data/local-image-review-2026-10-21.json` records the visual decisions; all intake files are preserved.

Following the resolution exception, `data/folder-image-review-2026-10-21.json` records 95 additional approvals across the supplied folders, 20 new relevance/people-photo rejections and two smaller duplicates. Earlier rejections remain in force. The approved collection contains 157 images across 23 styles, including all ten supplied Acidgrafix references. Folder originals are preserved, and unavailable source-page links are never invented.

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

Store `MONGODB_URI` only in ignored `.env.local` and Vercel's server environment. The read-only `api/images/[id].js` endpoint rejects retired image IDs with HTTP 410 and no-store caching.

The current manual import retains original bytes and dimensions, with separate WebP thumbnails for the index. Originals exceeding the 4.3 MB delivery budget are archived separately and served through a lossless WebP variant at the same native dimensions. If even that variant exceeds the delivery budget, the reference remains pending. The manual importer uses a 4,000 MB ceiling for `wfg`; historical migration tools default to a conservative 280 MB ceiling for older free clusters. Capacity failures remain pending instead of silently changing plans or removing older data.

## Design assets

`public/ui/` contains SVGs for the outlined Syne h, imperfect seven-point star, arrow, search icon, and button states. These implement the Canva component direction. The font glyph is preserved as an outline; the star has deliberately unequal points.

`scripts/create-ui-vectors.py` regenerates the SVG controls with Python, fontTools and Brotli. `scripts/prepare-shanshui.mjs` extracts the drawing algorithms from the preserved upstream source during each build and copies the license. `vendor/shan-shui-inf/ADAPTATION.md` documents the integration.

## Deployment

Vercel serves the app and image endpoint at https://hamanti.vercel.app. Production needs the existing `MONGODB_URI` secret. GitHub Actions runs tests and builds only; Pages deployment is disabled.

Strongly recommended: install the Vercel CLI with `npm i -g vercel` for `vercel env pull`, `vercel deploy`, and `vercel logs`.

```powershell
vercel deploy --prod
```

Keep `hamanti.vercel.app` attached as the Vercel production domain because the image URLs use it.

## Credits and verification

Shan Shui Inf and its MIT license are in `vendor/shan-shui-inf/`. Font licenses ship with the site. SVG background patterns and Motion example interactions are independently implemented; restricted Motion+ code is not included. Canva assets and the shan shui landscape are interface decoration, never art-style reference examples.

The user authorized tests on 2026-10-21. Run `npm test` for content-policy, catalog/search, navigation, reversible fan, deck count, flip, grip attachment, spring, hand-only asset and landscape-coverage regressions. All 37 tests pass for this update. Browser checks cover all 541 review frames at 1440 × 900 and 390 × 844, visible thumb continuity, hand separation, hover during flips, and native home/category transitions. The [correction audit](demos/correction-audit/AUDIT.md) includes the recordings and observed limits. Earlier work predating test authorization used builds and manual inspection only.

## Opening preparation

The initial `hamanti` wordmark builds from a conceptual pencil drawing into a clean serif masthead, inspired by [Motion's fill-text example](https://motion.dev/examples/react-loading-fill-text). The app prepares the hands, typography and entire landscape range for all 300 categories before revealing the page. It also warms available cover thumbnails for the first 120 alphabetically ordered styles, prioritizing the current search/detail route. Galleries remain on demand. Four concurrent image requests keep thumbnail preparation bounded.

The loader uses the homepage title's measured position, dimensions, font and spacing, including after fonts load or the viewport changes. Pencil marks and construction guides disappear as the finished ink fills. Home returns use the Wipe → Iris sequence in [Motion's mixed curtains](https://motion.dev/examples/js-curtains-mixed): a continuous left-to-right wipe covers the screen before the route changes, then a solid circle shrinks to reveal the destination. Category selection uses its own line cover. Both hold the current scroll position and complete card/hand pose until covered. The separate credits page hands off the same covered state to the homepage. Reduced-motion preferences use immediate navigation.

Progress reflects completed preparation tasks rather than a timer. There is no early-entry button or timeout that bypasses full landscape preparation. Optional thumbnail warmup may end after eight seconds; required landscape or hand failures show a retry screen. Reduced-motion and saved pause preferences disable the fill/fade animation. The loader appears once per document load, not on internal navigation. Original image quality and collection rules are unchanged.
