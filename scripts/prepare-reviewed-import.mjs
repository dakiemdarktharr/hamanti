// Merge saved checker approvals only. Never modifies intake files or guesses reviews.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { isFullHD, hasPeopleReview } from './compile-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await fs.readFile(new URL(name, root), 'utf8'));
const save = (name, value) => fs.writeFile(new URL(name, root), JSON.stringify(value, null, 2) + '\n');
const intake = await read('data/manual-intake.json');
const review = await read('data/manual-review.json');
const selection = await read('data/manual-selection.json');
const base = await fs.realpath(intake.directory);
const reviewDir = new URL('.tmp/collection-coordination/reviewed/', root);
const additions = [];
const replacements = [...(review.replacements || [])];
for (const name of (await fs.readdir(reviewDir)).filter(name => /^\d+\.json$/.test(name))) {
  const batch = JSON.parse(await fs.readFile(new URL(name, reviewDir), 'utf8'));
  const mapping = intake.folders.find(style => style.id === batch.style_id && style.name === batch.style);
  if (!mapping || path.resolve(batch.folder) !== path.resolve(base, mapping.folder))
    throw new Error(`Invalid folder mapping: ${name}`);
  for (const decision of batch.decisions || []) {
    if (decision.decision !== 'approved') continue;
    if (!hasPeopleReview(decision) || !isFullHD(decision.dimensions))
      throw new Error(`Incomplete approval: ${name}/${decision.filename}`);
    const file = await fs.realpath(path.join(base, mapping.folder, decision.filename));
    if (!file.toLowerCase().startsWith((path.join(base, mapping.folder) + path.sep).toLowerCase()))
      throw new Error('File escapes its style folder');
    const bytes = await fs.readFile(file);
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const metadata = await sharp(bytes).metadata();
    if (checksum !== decision.sha256.toLowerCase() || bytes.length !== decision.bytes ||
        !isFullHD(metadata) || metadata.width !== decision.dimensions.width || metadata.height !== decision.dimensions.height)
      throw new Error(`File changed after review: ${mapping.name}/${decision.filename}`);
    const source = new URL(decision.source_url);
    const page = new URL(decision.page_url);
    if (source.protocol !== 'https:' || page.protocol !== 'https:') throw new Error('Invalid source URL');
    const item = {
      style: mapping.name, folder: mapping.folder, file: decision.filename, checksum,
      title: `${mapping.name} — reference ${additions.filter(item => item.style === mapping.name).length + 1}`,
      url: page.href, sourceUrl: source.href, discoveryUrl: decision.discovery_url,
      provider: page.hostname.includes('pinterest.com') ? 'Pinterest' : 'ABCD Art Brut collection',
      peopleReview: decision.peopleReview, reviewReason: decision.reason,
      reviewedAt: batch.reviewed_at_local, dimensions: decision.dimensions, nativeFullHD:true,
      ...(decision.native_full_hd !== true ? {dimensionFlagCorrectedFromMeasuredPixels:true} : {}),
    };
    // The checker confirmed these original-size files replace their smaller local copies.
    for (const previous of review.approved) {
      if (previous.style === item.style && previous.checksum !== checksum &&
          previous.file === path.basename(source.pathname)) {
        const old = await sharp(path.join(base, previous.folder, previous.file)).metadata();
        if (metadata.width > old.width && metadata.height > old.height)
          replacements.push({style: item.style, oldChecksum: previous.checksum, newChecksum: checksum});
      }
    }
    additions.push(item);
  }
}
const retired = new Set(replacements.map(item => item.oldChecksum));
const merged = new Map(review.approved.filter(item => !retired.has(item.checksum)).map(item => [`${item.style}:${item.checksum}`, item]));
for (const item of additions) merged.set(`${item.style}:${item.checksum}`, item);
for (const [style, items] of Object.entries(selection))
  selection[style] = items.filter(item => !retired.has(item.imageUrl.replace(/^manual:/, '')));
await save('data/manual-review.json', {...review, reviewedAt:'2026-10-21',
  scope:'User stopped search/check and requested publication of saved approvals. Unreviewed candidates remain unpublished; intake is preserved.',
  approved:[...merged.values()], replacements});
await save('data/manual-selection.json', selection);
console.log(JSON.stringify({savedCheckerApprovals:additions.length,replacedLowerResolution:replacements.length,totalApproved:merged.size,intakePreserved:true}));
