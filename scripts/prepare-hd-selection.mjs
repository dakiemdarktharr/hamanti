import fs from 'node:fs/promises';
import { isFullHD, hasPeopleReview } from './compile-catalog.mjs';
const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await fs.readFile(new URL(name, root), 'utf8'));
const catalog = await read('data/catalog.json');
let storedMedia = {};
try { storedMedia = await read('data/hd-media-map.json'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const files = ['foundations-hd-approved.json', 'experimental-hd-parent-approved.json', 'experimental-hd-approved.json', 'art-hd-approved.json'];
const candidates = [];
for (const file of files) {
  try {
    candidates.push(...(await read(`data/research/${file}`)).map(item => ({
      ...item, url: item.url || item.sourceUrl, title: item.title || item.sourceTitle,
      provider: item.provider || item.discoveredBy || 'Pinterest via TinyFish',
    })));
  }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const selected = {};
for (const style of catalog.styles) {
  const seen = new Set();
  selected[style.name] = candidates.filter(item => {
    const identity = storedMedia[item.imageUrl]?.checksum || item.imageUrl;
    if (item.styleName !== style.name || item.reviewStatus !== 'approved' || !hasPeopleReview(item) || !item.url || !item.title || !isFullHD(item) || seen.has(identity)) return false;
    seen.add(identity); return true;
  }).slice(0, 8);
}
await fs.writeFile(new URL('data/hd-selection.json', root), JSON.stringify(selected, null, 2) + '\n');
try { await fs.writeFile(new URL('data/hd-media-map.json', root), '{}\n', { flag: 'wx' }); }
catch (error) { if (error.code !== 'EEXIST') throw error; }
console.log(`${Object.values(selected).reduce((n,s) => n+s.length, 0)} visually approved Full HD references.`);
