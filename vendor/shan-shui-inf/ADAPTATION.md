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

The browser moves an SVG viewBox with the horizontal scroll position.
Generated landscapes are interface decoration, not style reference images.
No remote scripts, images or calls are made by this integration.
