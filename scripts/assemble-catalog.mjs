import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await fs.readFile(new URL(name, root), 'utf8'));
const foundations = await read('data/research/ui-foundations.json');
const experimental = await read('data/research/ui-experimental.json');
const art = await read('data/research/art-influences.json');
const aliases = { 'Art influences': 'Art & graphic movements', 'Color and surface': 'Surfaces' };
const entries = [...foundations, ...experimental, ...art].map(entry => ({
  ...entry, group: aliases[entry.group] || entry.group,
}));
const groupOrder = [
  'Experimental web', 'Surfaces', 'Contemporary aesthetics', 'Composition', 'Typography',
  'Retro interfaces', 'Digital cultures', '3D and rendering', 'Digital distortion',
  'Generative graphics', 'Motion and light', 'Art & graphic movements',
  'Illustration & drawing', 'Printmaking', 'Collage & DIY', 'Paint & pigment', 'Textile & craft',
];
const groupNames = {
  Surfaces: 'Surfaces & materials', Composition: 'Layout & composition', Typography: 'Typography',
};
if (entries.length !== 300) throw new Error(`Expected 300 directions; found ${entries.length}.`);
const groups = groupOrder.map((name, index) => ({ id: String(index + 1), name: groupNames[name] || name,
  count: entries.filter(entry => entry.group === name).length }));
const styles = groupOrder.flatMap((group, groupIndex) => entries.filter(entry => entry.group === group)
  .map(entry => ({ ...entry, group: String(groupIndex + 1), kind: entry.kind || 'art influence' })))
  .map((entry, index) => ({ id: index + 1, ...entry }));
if (styles.length !== 300 || new Set(styles.map(s => s.name.toLowerCase())).size !== 300)
  throw new Error('Missing group or duplicate category names.');
const catalog = {
  version: 3, revisedAt: '2026-10-20', source: 'Original Obsidian notes and documented primary design references',
  scope: 'Web and interface aesthetics, visual composition, typography, and relevant art influences',
  originalNotes: './artstyles-300.md', groups, styles,
};
await fs.mkdir(new URL('data/archive/', root), { recursive: true });
try { await fs.copyFile(new URL('data/references.json', root), new URL('data/archive/references-v1.json', root), fs.constants.COPYFILE_EXCL); }
catch (error) { if (error.code !== 'EEXIST') throw error; }
await fs.writeFile(new URL('data/catalog.json', root), JSON.stringify(catalog, null, 2) + '\n');
console.log(`Assembled ${styles.length} directions in ${groups.length} families. Original collection archived.`);
