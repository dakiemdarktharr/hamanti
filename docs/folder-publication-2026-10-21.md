# Folder references — original resolution

The user explicitly removed the native Full HD requirement for images saved in
`D:\3000 reference images` on October 21, 2026.

The folder scan contains 189 images. Visual review adds 95 suitable references
to the 62 already published, for 157 approved images across 23 styles. Acidgrafix
receives all ten supplied images. The accepted files retain their original
pixels and format; small index previews are separate delivery variants.

Twenty newly reviewed files remain excluded for style relevance or casual
people photography. Ten previous rejections remain excluded. Two smaller copies
are duplicates of larger originals already retained. Every decision is recorded
with its filename and checksum in `data/folder-image-review-2026-10-21.json`.

The MongoDB importer still checks source-folder membership, reviewed checksums,
supported formats and stored-byte read-back. The compiler accepts a smaller
image only under the folder exception, with explicit intake verification in
both the image selection and storage records. External reference collections
retain their original resolution policy.

The site now labels counts as “references,” without an inaccurate Full HD claim.
Each reference keeps an accurate `nativeFullHD` data flag. Supplied images with
no source-page URL remain honestly labeled “Selected reference.”

No intake files are modified or deleted. The collection agents remain stopped.

Changed files: `app.js`, `sources.html`, `README.md`,
`data/collection-policy.json`, `data/manual-review.json`,
`data/folder-image-review-2026-10-21.json`, `data/manual-selection.json`,
`data/manual-media-map.json`, `data/manual-import-report.json`,
`data/references.json`, `data/coverage.csv`, `scripts/compile-catalog.mjs`,
`scripts/import-manual-images.mjs`, `tests/catalog.test.mjs`, and this document.
