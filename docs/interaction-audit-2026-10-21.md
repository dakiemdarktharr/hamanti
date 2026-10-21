# Interaction and presentation audit — 21 October 2026

## Published content

The intake directory contains 189 images across 24 populated folders. Of 73
native Full HD files, 62 are already published across 11 styles. The other
qualifying files are ten rejected references and one smaller duplicate replaced
by its larger original. Another 116 files fall below the retained Full HD
requirement. No additional unreviewed Full HD images were found in this pass.
JPEG, PNG, WebP and AVIF references are accepted; SVG is for authored interface
graphics and scenery. All originals in the intake directory remain untouched.

## Design direction

The paper, dark-green ink, oversized wordmark, imperfect star, alphabetical
handscroll and existing home curtain sequence remain. Improvements use the
reference sites as direction rather than copying assets or adding heavy effects:

| Reference | Applied direction |
| --- | --- |
| [Stripe Press](https://press.stripe.com/) | Cover-led cards, clear titles and quieter metadata. |
| [Boom](https://www.stripe.press/boom) | Deliberate reading rhythm and a visible position within the index. |
| [Mercury](https://mercury.com/) | Predictable search, useful feedback and recoverable failures. |
| [Lollypop](https://lollypop.design/designathon2026/) | Clear progression between introduction and exploration. |
| [Lusion](https://lusion.co/) | Responsive interaction and controlled motion without introducing a 3D runtime. |
| [Obys](https://obys.agency/) | Strong typographic hierarchy and reference-first presentation. |
| [Flayks](https://flayks.com/) | Expressive type balanced with simple navigation. |

## Fixes and browser checks

Checked in Chromium using the Playwright browser plugin. Viewports included
320, 390, 768, 1024, 1440 and 1920 CSS pixels. Touch was exercised with native
browser input emulation. These checks do not constitute a screen-reader or
cross-browser certification.

| Interaction | Result |
| --- | --- |
| Initial loader and home title | Matching title geometry; layout is available before content arrives; caret appears only during actual typing. |
| Home → introduction → index | Horizontal links, wheel, keyboard and native touch swipe work. Intro words begin revealing only after crossing the viewport centre. |
| Search | Names, aliases, tags, visible ranks and typo-tolerant search work; slash, Escape, clear and Arrow Down paths checked. |
| A–Z filter and empty results | Filtering and reset work; empty feedback stays within the usable viewport. |
| Index navigation | Previous/next controls and card arrow-key navigation work. Seven complete desktop cards, five tablet cards and one readable phone card remain visible. |
| Resize | Preserves the current section/card position and adapts the gallery without losing the selected reference. No document-width overflow at the checked sizes. |
| History | Back/Forward resynchronizes URL query, letter filter, results and saved page position. |
| Invalid style URL | Recovers to the index with a short explanation instead of silently showing the wrong screen. |
| Detail pages | Empty, one-image, partial and larger collections checked; descriptions, counts, pending states and alphabetical next-style links remain accurate. |
| Gallery | Scroll, arrows, Home/End and full-size image promotion checked. Tall references are contained instead of cropped. |
| Viewer | Previous/next, arrow keys, Home/End, Escape, close, source link, focus containment and focus restoration checked. |
| Image failures | Simulated network failures show a retry state; both gallery retry and viewer retry successfully recover. Focus remains usable when retry disappears or a navigation button becomes disabled. |
| Catalog failure | A simulated HTTP 500 shows a retry action; retry recovers all 300 entries. It does not silently replace the revised catalog with archived content. |
| Motion settings | Saved pause works; system reduced motion takes precedence and cannot be overridden by the control. |
| Footer and credits | Notes, data, credits, next-style and home links checked. Credits → home retains the covered handoff and does not restart the opening title animation. |

## Transition frame inspection

Paused the actual browser animations at wipe times 0, 125, 250, 375 and 499 ms,
then iris times 0, 162, 325, 488 and 649 ms. Inspected screenshots and route state.
The style route stays unchanged throughout closing. At full coverage the route
commits, then the solid disc shrinks away. There is one wipe and one iris, with
no extra panel or title transition. Input is inert during the cover and focus
moves after it finishes. The iris scales edge-to-edge during viewport changes.

The landscape now postpones SVG decoding during route animations, including a
first home return from a direct style URL. Its existing decoded image continues
to move during scrolling. Worker-side contour compaction reduced a fixed-seed
scene from 19,770,070 to 11,016,700 bytes, approximately 44%, while retaining
separate translucent washes and paint order. A clean browser sample recorded a
16.7 ms median and 17.8 ms 95th-percentile frame interval during index navigation;
occasional longer frames remain, so this is not a universal frame-rate guarantee.

Unit checks: `npm test` — 18 passed. Production build: `npm run build` passed.
Frame captures and network-failure evidence are in ignored `.tmp/` files.

## Changed files

- `app.js`
- `index.html`
- `lib/handbook.js`
- `lib/lightbox.js`
- `lib/loading.css`
- `lib/loading.js`
- `lib/navigation.js`
- `lib/page-transition.js`
- `lib/polish.css`
- `lib/search.js`
- `lib/shanshui.js`
- `public/shan-shui/compact.js`
- `public/shan-shui/worker.js`
- `tests/landscape.test.mjs`
- `tests/route-state.test.mjs`
- `vendor/shan-shui-inf/ADAPTATION.md`
- `README.md`
- `docs/interaction-audit-2026-10-21.md`
