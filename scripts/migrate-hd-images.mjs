import { MongoClient, Binary } from 'mongodb';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { isFullHD, hasPeopleReview, compileCatalog } from './compile-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await fs.readFile(new URL(name, root), 'utf8'));
const uri = process.env.MONGODB_URI;
if (!uri?.startsWith('mongodb')) throw new Error('Set MONGODB_URI in the local environment.');
const capacityArgument = process.argv.find(arg => arg.startsWith('--capacity-mb='));
const capacityMB = capacityArgument ? Number(capacityArgument.split('=')[1]) : 280;
if (!Number.isFinite(capacityMB) || capacityMB < 1 || capacityMB > 4500) throw new Error('Invalid archive capacity.');
const selection = await read('data/hd-selection.json');
const media = await read('data/hd-media-map.json');
const oldMedia = await read('data/media-map.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const client = new MongoClient(uri, { maxPoolSize: 3, serverSelectionTimeoutMS: 15000 });
const hex = rgb => '#' + rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
function palette(pixels) {
  const bins = new Map();
  for (let i = 0; i < pixels.length; i += 3) {
    const rgb = [...pixels.subarray(i, i + 3)];
    if (Math.max(...rgb) - Math.min(...rgb) < 25 || Math.max(...rgb) < 35 || Math.min(...rgb) > 225) continue;
    const key = rgb.map(c => Math.floor(c / 40)).join();
    const bin = bins.get(key) || { n: 0, sum: [0, 0, 0] };
    bin.n++; rgb.forEach((c, k) => bin.sum[k] += c); bins.set(key, bin);
  }
  const winner = [...bins.values()].sort((a,b) => b.n - a.n)[0];
  const rgb = winner ? winner.sum.map(c => c / winner.n) : [128, 150, 115];
  return { background: hex(rgb.map(c => 12 + c * .055)), accent: hex(rgb.map(c => c * .65 + 255 * .35)),
    method: 'dominant chromatic bucket from selected reference' };
}
const jobs = [...new Map(Object.values(selection).flat().map(item => [item.imageUrl, item])).values()];
const report = { date: new Date().toISOString(), selectedFiles: jobs.length, stored: 0, reused: 0, bytesAdded: 0, failures: [] };
try {
  await client.connect();
  const db = client.db('hamanti'), images = db.collection('images');
  const stats = await db.command({ dbStats: 1 });
  let totalSize = Number(stats.dataSize);
  for (const item of jobs) {
    try {
      if (item.reviewStatus !== 'approved' || !hasPeopleReview(item) || !isFullHD(item)) throw new Error('Unreviewed or undersized source');
      const image = await fs.readFile(new URL(item.cachePath, root));
      const dimensions = await sharp(image).metadata();
      if (!isFullHD(dimensions) || image.length > 4300000) throw new Error('Image delivery constraint');
      const colors = palette(await sharp(image).resize(40, 40, { fit: 'inside' }).removeAlpha().toColourspace('srgb').raw().toBuffer());
      const checksum = hash(image);
      const id = media[item.imageUrl]?.id || (oldMedia[item.imageUrl] && isFullHD(oldMedia[item.imageUrl]) ? oldMedia[item.imageUrl].id : hash(`hd-v1:${item.imageUrl}`));
      const existing = await images.findOne({ _id: id }, { projection: { _id: 1, size: 1, mime: 1, checksum: 1 } });
      if (!existing) {
        if (totalSize + image.length > capacityMB * 1000000) throw new Error('Archive capacity safeguard reached; existing files preserved');
        await images.insertOne({ _id: id, data: new Binary(image), mime: 'image/webp', size: image.length,
          width: dimensions.width, height: dimensions.height, sourceUrl: item.imageUrl, checksum,
          collectionVersion: 3, nativeFullHD: true, createdAt: new Date() });
        totalSize += image.length; report.bytesAdded += image.length; report.stored++;
      } else report.reused++;
      media[item.imageUrl] = { id, width: dimensions.width, height: dimensions.height,
        size: existing?.size || image.length, mime: existing?.mime || 'image/webp', checksum: existing?.checksum || checksum, palette: colors };
    } catch (error) {
      report.failures.push({ style: item.styleName, imageUrl: item.imageUrl,
        reason: /constraint|undersized|capacity/.test(error.message) ? error.message : error.name });
    }
    if ((report.stored + report.failures.length) % 20 === 0) await fs.writeFile(new URL('data/hd-media-map.json', root), JSON.stringify(media));
  }
  await fs.writeFile(new URL('data/hd-media-map.json', root), JSON.stringify(media));
  await fs.writeFile(new URL('data/hd-migration-report.json', root), JSON.stringify(report, null, 2));
  const compiled = await compileCatalog();
  const catalog = await read('data/catalog.json');
  await db.collection('references_v3').bulkWrite(catalog.styles.map(style => ({
    updateOne: { filter: { _id: style.id }, update: { $set: { ...style, ...compiled.styles[style.id], updatedAt: new Date() } }, upsert: true },
  })));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  // Driver errors can contain connection details; keep credentials out of logs.
  const code = typeof error.code === 'string' && /^[A-Z_0-9]+$/.test(error.code) ? ` (${error.code})` : '';
  console.error(`Image migration could not finish: ${error.name}${code}`);
  process.exitCode = 1;
} finally { await client.close(); }
