import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Only accepts URLs observed in source pages. It never guesses a larger variant.
const root = path.resolve(import.meta.dirname, '..');
const input = path.join(root, 'data/research/experimental-hd-discovered.json');
const target = path.join(root, 'data/research/experimental-hd-candidates.json');
const reportFile = path.join(root, 'data/research/experimental-hd-report.json');
const cache = path.join(root, '.image-cache/hd');
await fs.mkdir(cache, { recursive: true });
const discovered = JSON.parse(await fs.readFile(input, 'utf8'));
const existing = await fs.readFile(target, 'utf8').then(JSON.parse).catch(() => []);
const candidates = new Map(existing.map(row => [`${row.styleName}|${row.imageUrl}`, row]));
const unique = [...new Set(discovered.map(row => row.imageUrl))];
const fullHD = (width, height) =>
  (width >= 1920 && height >= 1080) || (width >= 1080 && height >= 1920);
const report = {
  startedAt: new Date().toISOString(), discovered: discovered.length,
  uniqueFiles: unique.length, downloaded: 0, belowHD: 0, qualifying: 0, failures: [],
};
let cursor = 0;
let cacheBytes = 0;
for (const name of await fs.readdir(cache)) cacheBytes += (await fs.stat(path.join(cache, name))).size;
const maxCacheBytes = 1024 * 1024 * 1024;
async function worker() {
  while (cursor < unique.length) {
    const imageUrl = unique[cursor++];
    const id = crypto.createHash('sha256').update(imageUrl).digest('hex');
    const file = path.join(cache, `${id}.webp`);
    const matching = discovered.filter(row => row.imageUrl === imageUrl);
    if (matching.every(row => [...candidates.values()].filter(item => item.styleName === row.styleName).length >= 16)) continue;
    try {
      const measuredFile = path.join(cache, `${id}.metadata.json`);
      const measured = await fs.readFile(measuredFile, 'utf8').then(JSON.parse).catch(() => null);
      if (measured && !fullHD(measured.width, measured.height)) { report.belowHD++; continue; }
      let encoded = await fs.readFile(file).catch(() => null);
      let metadata;
      if (encoded) {
        metadata = await sharp(encoded).metadata();
      } else {
        const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const advertised = Number(response.headers.get('content-length') || 0);
        if (advertised > 32 * 1024 * 1024) throw new Error('Original exceeds 32 MiB download cap');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 32 * 1024 * 1024) throw new Error('Original exceeds 32 MiB download cap');
        metadata = await sharp(bytes, { limitInputPixels: 60000000 }).metadata();
        report.downloaded++;
        await fs.writeFile(measuredFile, JSON.stringify({ width: metadata.width, height: metadata.height, imageUrl }));
        if (!fullHD(metadata.width, metadata.height)) { report.belowHD++; continue; }
        encoded = await sharp(bytes, { limitInputPixels: 60000000 })
          .webp({ quality: 78, effort: 3 }).toBuffer();
        if (encoded.length > 4300000) throw new Error('Encoded image exceeds existing endpoint body budget');
        if (cacheBytes + encoded.length > maxCacheBytes) throw new Error('Local review cache exceeds 1 GiB; review storage budget');
        cacheBytes += encoded.length;
        await fs.writeFile(file, encoded);
      }
      if (!fullHD(metadata.width, metadata.height)) continue;
      report.qualifying++;
      for (const row of matching) {
        if ([...candidates.values()].filter(item => item.styleName === row.styleName).length >= 16) continue;
        candidates.set(`${row.styleName}|${imageUrl}`, {
          ...row, width: metadata.width, height: metadata.height,
          nativeFullHD: true, bytes: encoded.length,
          cachePath: path.relative(root, file).replaceAll('\\', '/'),
          mime: 'image/webp', collectedAt: new Date().toISOString(),
          reviewStatus: 'needs-visual-review',
        });
      }
    } catch (error) {
      report.failures.push({ imageUrl, error: error.message });
    }
    if (report.downloaded > 0 && (report.downloaded + report.failures.length) % 40 === 0) {
      await fs.writeFile(target, JSON.stringify([...candidates.values()], null, 2) + '\n');
      console.log(`Measured ${report.downloaded}; HD ${report.qualifying}; below HD ${report.belowHD}; failed ${report.failures.length}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
report.finishedAt = new Date().toISOString();
report.cachedBytes = cacheBytes;
report.styleCoverage = [...new Set(discovered.map(row => row.styleName))].map(styleName => ({
  styleName, qualifying: [...candidates.values()].filter(row => row.styleName === styleName).length,
}));
await fs.writeFile(target, JSON.stringify([...candidates.values()], null, 2) + '\n');
await fs.writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
