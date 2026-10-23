# Correction audit — 24 October 2026

Preview: http://localhost:4180/?preview=hands#/index

The approved hand renderer is now enabled on the normal site. The preview
query adds review controls only. A separate [normal-site check](final/normal-site-audit.json)
verified two hand layers, five initial cards, an empty lower deck, complete
300-category landscape coverage, live scroll-driven hand movement, and no
review controls or inspection API on an ordinary visit.

| Reported problem | Correction | Verification |
| --- | --- | --- |
| Thumb/palm cuts at card edges | Complete hand meshes in both passes; matching invisible card depth surfaces replace skin cuts at bone weights. Paper plane calibrated to rig Y = 3.55; lower-margin thumb contacts. | All 541 desktop and 541 phone frames: visible thumbs connect to the appropriate sleeve once raised. |
| Departing card crosses the left palm | Card lifts clear before flipping down toward the outgoing deck; destination and smooth endpoint velocity retained. | Full forward/reverse sequence; contact images at frames 54, 108, 176, 180 and 270; later categories 26.5 and 31.5. |
| Stationary white rectangle behind a flipping card | Link background/shadow removed in hover and focus; both printed faces perform the flip; hover/focus preserve the controller's scale and depth order. | Half-flipped outgoing card hovered; transparent link and no link shadow asserted. Shared card-surface math and depth-projection roundtrip verified throughout. |
| Home title appears before logo cover | Preserve native scroll offset while Lenis stops; freeze complete card/spring/finger pose until covered. | 186 native animation-frame observations and 119 screencast frames during logo navigation with wheel momentum. No premature title; exact source grip retained until covered. |
| Home title flashes during category selection | Route commit happens only beneath an opaque cover; destination background setup completes before reveal. | 218 native animation-frame observations and 127 screencast frames. No home-title exposure at any point. |
| Unloaded title too finished | Pencil contours, hatching, straight construction lines, graphite smears, erased strokes and crumbs fade into the clean serif masthead. | Recorded actual loading progress; all 24/24 landscape tiles prepared for all 300 categories before reveal. |
| Unwanted home caption | Removed “Follow what catches your eye” from markup. | Browser assertion confirms zero caption elements. |

Desktop viewport: 1440 × 900. Phone viewport: 390 × 844. Minimum desktop hand-to-hand separating X interval: 1.5129 source units. Maximum numerical projection roundtrip error: 3.22e-13 CSS pixels (this measures projection arithmetic, not raster-edge accuracy). No browser, shader or WebGL errors were observed. All 37 unit tests pass; production build succeeds.

The visible-silhouette check floods from each actual skinned thumb nail through the composite hand pixels to the sleeve's lower or side viewport exit, accounting for translucent card faces. Invisible depth surfaces use the HTML cards' rounded outlines, rotation, perspective flip and scale. These checks verify the recorded local preview; they are not a claim about every browser/device.

## Review media

- [Corrected hands — 9 seconds](final/corrected-hands.mp4)
- [Logo transition — real timing](final/logo-transition.mp4)
- [Category transition — real timing](final/category-transition.mp4)
- [Sketch to print — loading time-lapse](final/sketch-to-print-timelapse.mp4)
- [Concept sketch still](final/concept-sketch.jpg)
- [Corrected grip still](final/corrected-grip.png)
- [Logo transition contact sheet](final/home-contact-sheet.png)
- [Category transition contact sheet](final/category-contact-sheet.png)

Native transition video timing comes from browser screencast timestamps. The hand review is 270 rendered frames at 30 fps. Loading is intentionally presented as a time-lapse. Raw observations: [desktop and transitions](after/audit.json), [phone](mobile/audit.json), [recording and coverage](final/recording.json).
