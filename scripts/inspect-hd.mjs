import fs from 'node:fs/promises';
import sharp from 'sharp';

const base = new URL('../', import.meta.url);
const fullHD = ({ width, height }) =>
  (width >= 1920 && height >= 1080) || (width >= 1080 && height >= 1920);
const media = Object.values(JSON.parse(await fs.readFile(new URL('data/media-map.json', base), 'utf8')));
const references = JSON.parse(await fs.readFile(new URL('data/archive/references-v1.json', base), 'utf8')
  .catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return fs.readFile(new URL('data/references.json', base), 'utf8');
  }));
const styles = Object.entries(references.styles).map(([id, style]) => ({
  id: Number(id), name: style.name, qualifying: style.examples.filter(fullHD).length,
}));
const audit = {
  auditedAt: new Date().toISOString(),
  rule: 'Native width >= 1920 and height >= 1080, or width >= 1080 and height >= 1920; no upscaling.',
  uniqueImages: media.length,
  qualifyingUniqueImages: media.filter(fullHD).length,
  qualifyingStyleSlots: styles.reduce((sum, style) => sum + style.qualifying, 0),
  stylesWithAnyHD: styles.filter(style => style.qualifying > 0).length,
  stylesWithEightHD: styles.filter(style => style.qualifying >= 8).length,
  originalBytes: media.reduce((sum, image) => sum + image.size, 0),
  qualifyingBytes: media.filter(fullHD).reduce((sum, image) => sum + image.size, 0),
  styles,
};
await fs.writeFile(new URL('data/research/hd-audit.json', base), JSON.stringify(audit, null, 2) + '\n');
if (process.argv.includes('--probe')) {
  const target = new URL('data/research/hd-original-probe.json', base);
  const candidates = JSON.parse(await fs.readFile(target, 'utf8'));
  const results = [];
  for (const { image, page } of candidates) {
    try {
      const response = await fetch(image, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(bytes).metadata();
      const result = {
        image, page, status: response.status,
        width: metadata.width, height: metadata.height, bytes: bytes.length,
        fullHD: fullHD(metadata),
      };
      if (result.fullHD) {
        const compressed = await sharp(bytes).webp({ quality: 80, effort: 4 }).toBuffer();
        result.webpBytesAtQuality80 = compressed.length;
      }
      results.push(result);
    } catch (error) {
      results.push({ image, page, error: error.message });
    }
  }
  await fs.writeFile(target, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ ...audit, styles: undefined, probe: results }, null, 2));
} else {
  console.log(JSON.stringify({ ...audit, styles: undefined }, null, 2));
}
