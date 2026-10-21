# hamanti integration

Source: https://github.com/LingDong-/shan-shui-inf

Pinned upstream commit: `9f754d2b2e73495db7883d4d4055a7b0903b0454`.
Copyright (c) 2018 Lingdong Huang. MIT license; see `LICENSE`.

The original `index.html`, `README.md`, and license are preserved here.
`scripts/prepare-shanshui.mjs` extracts the PRNG, noise, geometry, utility and
landscape generator scripts. It removes the upstream page UI, DOM updates,
downloader and console logging, and changes `window.btoa` to `self.btoa`.
The extracted classic script runs only in a Web Worker. The worker retains
bounded terrain/planning data and recolors grayscale washes to the hamanti
logo's dark green (`#222a20`) on the site's paper (`#e9ebe2`).

The browser moves a decoded SVG image with the horizontal scroll position.
Generated landscapes are interface decoration, not style reference images.
No remote scripts, images or calls are made by this integration.
## Scrolling performance update

The generated SVG remains vector artwork, but is decoded as an image before it
enters the page. The browser moves one image layer with `translate3d` rather than
repainting thousands of inline paths after a viewBox change. A worker-generated
buffer covers the viewport plus a margin; requests are coalesced, obsolete views
are discarded, and object URLs are revoked when replaced. Generation and
decoding failures retain the previous view or leave the plain paper background.

The worker compacts generated contours to a maximum 0.6 drawing-unit deviation
on the 800-unit canvas before delivery. It retains paint order, separate
translucent washes and filled contours. Opaque adjacent contours with identical
styles can share a path. New SVG decoding waits until a scroll gesture or route
animation has settled, leaving the existing image layer in place during input.
This also applies when returning from a direct style link to the home page.
