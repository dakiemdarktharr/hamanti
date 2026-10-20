# Native Full HD reference acquisition

Audited 20 October 2026. This is a content audit and collection record; no tests were added or run.

## Existing archive

An image qualifies only when its decoded native width and height are at least **1920 × 1080**, or **1080 × 1920** for portrait work. A 1920-pixel long edge alone does not qualify. The pipeline does not enlarge images.

| Measure | Count |
| --- | ---: |
| Distinct stored image files | 2,159 |
| Files meeting native Full HD | 41 |
| Files below the requirement | 2,118 |
| Existing reference slots meeting Full HD | 46 / 2,400 |
| Styles with any qualifying reference | 40 / 300 |
| Styles with eight qualifying references | 0 / 300 |
| Existing original image bytes | 184,608,781 |

The machine-readable audit is [hd-audit.json](hd-audit.json). `scripts/inspect-hd.mjs` reproduces this metadata audit from the recorded dimensions.

## Pinterest originals: measured feasibility

TinyFish retrieved actual image links from the existing [Art Nouveau collection](https://www.pinterest.com/ideas/art-nouveau-graphic-design/947878127195/). Eight `/originals/` URLs were present. The downloaded files ranged from 488 × 471 to 1400 × 2000. **Only two of eight met the strict Full HD rule.** An `originals` URL therefore must not be treated as evidence of resolution.

The two qualifying files were 1400 × 2000 and 1080 × 1920. Encoding them as WebP at unchanged dimensions reduced their sizes to 483,196 and 120,184 bytes. The larger source PNG was 4,559,513 bytes, which exceeds the application's existing conservative image-response budget before encoding. Actual measurements and observed URLs are recorded in [hd-original-probe.json](hd-original-probe.json).

A direct Bauhaus pin exposed only a 736-pixel image. One Risograph ideas page timed out. A source page that supplies no original URL stays pending; the collection does not manufacture a larger URL by editing a thumbnail path.

## Collection procedure

1. Search Pinterest using the exact category name, retaining the query, source title and URL.
2. Read relevant pin or collection pages and retain only image URLs actually supplied by those pages.
3. Fetch the image bytes, decode their dimensions, and reject anything below the threshold.
4. Encode qualifying images as WebP without resizing. Keep original dimensions, original image URL, Pinterest source URL, and collection date.
5. Deduplicate within each category. Visually review candidates for relevance, watermarks, process diagrams and unrelated images before publication.
6. Keep incomplete categories visibly pending until eight relevant, qualifying images exist.

`scripts/collect-art-hd.mjs` implements the byte-level portion of this procedure. Its output is explicitly marked `needs-visual-review`, not treated as a completed collection. It caches files under the ignored `.image-cache/hd/` directory and does not upload to MongoDB.

TinyFish currently permits 30 requests per minute across the connected account. Shared research workers must coordinate against this limit. The connected Firecrawl account returned **insufficient credits** and did not execute the attempted screenshot request; no retries or purchases were made.

## Final art-influence collection checkpoint

This checkpoint covers the 80 entries in [art-influences.json](art-influences.json), not the full 300-category handbook. Queries use the aesthetic name alone, the name followed by “design,” or the name followed by “aesthetics.” They do not force a web/UI qualifier.

| Measure | Count |
| --- | ---: |
| Pinterest source pages providing original image URLs | 397 |
| Discovered category/image pairs | 7,684 |
| Distinct observed image URLs | 7,630 |
| Native Full HD candidate references | 800 |
| Candidates visually reviewed | 800 |
| Accepted references | 475 |
| Rejected references | 325 |
| Accepted without photographed people | 450 |
| Accepted with clearly posed model/editorial photography | 25 |
| Styles with at least eight accepted references | 20 / 80 |
| Styles with one to seven accepted references | 59 / 80 |
| Styles still without accepted references | 1 / 80 |
| Usable reference slots, capped at eight per style | 430 / 640 |
| Remaining reference slots | 210 |
| Accepted WebP bytes at unchanged native dimensions | 267,298,030 |

Every accepted reference has an explicit `peopleReview` value. Drawn or painted figures remain eligible. Deliberately posed model/editorial imagery remains eligible under the user's refined instruction. Candid/group photographs, selfies, tutorial presenters, and photographed hands holding artwork were excluded. The final 27 cached candidates were reviewed after collection paused: 21 were accepted and six rejected, including one image of a hand holding a drawing.

Japanese Modernism remains pending. Rayonism now has one accepted reference. The complete category-level shortfall is recorded in [art-hd-coverage.json](art-hd-coverage.json). Discovery, native-dimension verification and visual approval remain separate in [art-hd-discovered.json](art-hd-discovered.json), [art-hd-candidates.json](art-hd-candidates.json), [art-visual-review.json](art-visual-review.json), and [art-hd-approved.json](art-hd-approved.json).

**Collection was paused to finish review and deployment; sources were not exhausted.** Eight suitable references per category have not been achieved. Many originals were below native Full HD, and keyword matches frequently showed architecture, unrelated objects, process tutorials or unsuitable photographs. Some otherwise promising files failed decoding or exceeded the collection limits. Search results and visited-page records remain available for a later continuation. No additional crawling occurred during the final photo-policy review.

Local review sheets remain in `.tmp/art-review/`, `.tmp/art-review-unreviewed/`, and `.tmp/art-people-review/`; their manifests preserve the image URL and source-page mapping. The final cached-candidate review uses `manifest-round8.json`. Review decisions are retained in the tracked visual-review JSON, including rejection reasons.

## Other acquisition routes researched

The user subsequently specified **Pinterest searches by category name**, so the following routes are documented for feasibility only and are **not substituted for the requested Pinterest references**:

- [Met Collection API](https://metmuseum.github.io/) provides public-domain high-resolution image URLs and artwork attribution. Its documentation now specifies the paginated `/v1.1/search` endpoint; the earlier `/v1/search` endpoint was scheduled for retirement on 1 October 2026.
- [Cleveland Museum of Art Open Access API](https://openaccess-api.clevelandart.org/) supplies web, print and full-size image URLs with CC0 metadata.
- [Art Institute of Chicago API](https://api.artic.edu/docs/#images) provides image identifiers and IIIF image metadata; the institution asks small scrapers to stay at or below one request per second. Its commonly recommended 843-pixel images do not qualify here.
- [Firecrawl screenshot documentation](https://docs.firecrawl.dev/advanced-scraping-guide) supports native viewport dimensions such as 1920 × 1080. A genuine website screenshot can be Full HD, but it is a different source type and is not an enlargement of a Pinterest image.

## Storage handoff

The accepted art-influence candidates total about 267 MB before the eight-per-category publication cap. The parent task identified an existing empty MongoDB Flex deployment with 5 GB capacity for the complete collection. This research pipeline does not upload files, modify database configuration, purchase capacity, or remove the existing archive. It supplies verified local WebP files and provenance metadata for the application's migration step.
