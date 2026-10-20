import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root = path.resolve(import.meta.dirname, '..');
const input = process.argv[2] || 'data/research/experimental-hd-candidates.json';
const name = process.argv[3];
const candidates = JSON.parse(await fs.readFile(path.resolve(root, input), 'utf8'));
const groups = Map.groupBy(candidates.filter(c => !name || c.styleName === name), c => c.styleName);
await fs.mkdir(path.join(root, '.tmp/review'), { recursive: true });
const manifest = [];
const xml = text => text.replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
for (const [styleName, items] of groups) {
  const columns = 4, cellW = 420, cellH = 330;
  const selected = items.slice(0, 16);
  const pieces = [];
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i], x = i % columns * cellW, y = Math.floor(i / columns) * cellH;
    const thumb = await sharp(path.resolve(root, item.cachePath)).resize(cellW - 12, cellH - 50, { fit: 'contain', background: '#e9ebe2' }).png().toBuffer();
    const label = Buffer.from(`<svg width="${cellW}" height="46"><rect width="100%" height="100%" fill="#e9ebe2"/><text x="8" y="20" font-family="Arial" font-size="14">${i + 1}. ${xml(styleName)}</text><text x="8" y="38" font-family="Arial" font-size="12">${item.width} × ${item.height}</text></svg>`);
    pieces.push({ input: thumb, left: x + 6, top: y }, { input: label, left: x, top: y + cellH - 46 });
  }
  const filename = styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = `.tmp/review/${filename}.jpg`;
  await sharp({create:{width:columns*cellW,height:Math.ceil(selected.length/columns)*cellH,channels:3,background:'#e9ebe2'}})
    .composite(pieces).jpeg({quality:90}).toFile(path.resolve(root, file));
  manifest.push({ styleName, file, items: selected.map((item, i) => ({ rank: i + 1, imageUrl: item.imageUrl, source: item.url })) });
}
await fs.writeFile(path.join(root, '.tmp/review/manifest.json'), JSON.stringify(manifest, null, 2));
console.log(manifest.map(s => ({ styleName: s.styleName, file: s.file, count: s.items.length })));
