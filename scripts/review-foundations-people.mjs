import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const input = process.argv[2] || 'data/research/foundations-hd-approved.json';
const output = process.argv[3] || '.tmp/foundations-people-review';
const rows = JSON.parse(await fs.readFile(path.join(root, input), 'utf8'));
const folder = path.join(root, output);
await fs.mkdir(folder, { recursive: true });
const manifest = [];
const xml = text => String(text).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
for (let offset = 0; offset < rows.length; offset += 6) {
  const items = rows.slice(offset, offset + 6), pieces = [];
  const cellW = 700, cellH = 620, columns = 3;
  for (let i = 0; i < items.length; i++) {
    const item = items[i], x = i % columns * cellW, y = Math.floor(i / columns) * cellH;
    const thumb = await sharp(path.resolve(root, item.cachePath)).resize(cellW - 12, cellH - 50, { fit: 'contain', background: '#e9ebe2' }).png().toBuffer();
    const label = Buffer.from(`<svg width="${cellW}" height="46"><rect width="100%" height="100%" fill="#e9ebe2"/><text x="8" y="20" font-family="Arial" font-size="18">${offset + i + 1}. ${xml(item.styleName)}</text><text x="8" y="40" font-family="Arial" font-size="14">${item.width} × ${item.height}</text></svg>`);
    pieces.push({ input: thumb, left: x + 6, top: y }, { input: label, left: x, top: y + cellH - 46 });
  }
  const file = `${output}/sheet-${String(offset / 6 + 1).padStart(2, '0')}.jpg`;
  await sharp({ create: { width: columns * cellW, height: Math.ceil(items.length / columns) * cellH, channels: 3, background: '#e9ebe2' } }).composite(pieces).jpeg({ quality: 95 }).toFile(path.join(root, file));
  manifest.push({ file, items: items.map((item, i) => ({ reviewId: offset + i + 1, styleName: item.styleName, imageUrl: item.imageUrl, cachePath: item.cachePath })) });
}
await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log({ images: rows.length, sheets: manifest.length });
