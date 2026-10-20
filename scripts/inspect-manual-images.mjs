import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { isFullHD } from './compile-catalog.mjs';

const root = new URL('../', import.meta.url);
const intake = JSON.parse(await fs.readFile(new URL('data/manual-intake.json', root), 'utf8'));
const output = new URL('.tmp/manual-review/', root);
await fs.mkdir(output, { recursive: true });
const rows = [];
for (const style of intake.folders) {
  const directory = path.join(intake.directory, style.folder);
  for (const file of (await fs.readdir(directory)).sort()) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    const source = path.join(directory, file);
    const bytes = await fs.readFile(source);
    const metadata = await sharp(bytes).metadata();
    rows.push({ index: rows.length + 1, style: style.name, folder: style.folder, file,
      checksum: createHash('sha256').update(bytes).digest('hex'),
      width: metadata.width, height: metadata.height, fullHD: isFullHD(metadata) });
  }
}
await fs.writeFile(new URL('inventory.json', output), JSON.stringify(rows, null, 2));
const escape = text => text.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
for (let start = 0; start < rows.length; start += 24) {
  const layers = [];
  for (const [i, row] of rows.slice(start, start + 24).entries()) {
    const left = (i % 4) * 400, top = Math.floor(i / 4) * 340;
    const image = await sharp(path.join(intake.directory, row.folder, row.file))
      .resize(390, 275, { fit: 'contain', background: '#e9ebe2' }).toBuffer();
    const label = Buffer.from(`<svg width="400" height="60"><rect width="400" height="60" fill="#fff"/><text x="8" y="23" font-size="16" font-family="sans-serif">${row.index}. ${escape(row.style)}</text><text x="8" y="45" font-size="15" font-family="sans-serif">${row.width} × ${row.height} · ${row.fullHD ? 'FULL HD' : 'SMALL'}</text></svg>`);
    layers.push({input:image,left:left+5,top}, {input:label,left,top:top+275});
  }
  await sharp({create:{width:1600,height:Math.ceil(Math.min(24,rows.length-start)/4)*340,channels:3,background:'#e9ebe2'}})
    .composite(layers).jpeg({quality:85}).toFile(new URL(`sheet-${Math.floor(start/24)+1}.jpg`,output).pathname.replace(/^\/([A-Z]:)/,'$1'));
}
console.log(JSON.stringify({files:rows.length,fullHD:rows.filter(r=>r.fullHD).length,styles:new Set(rows.map(r=>r.style)).size,output:output.href}));
