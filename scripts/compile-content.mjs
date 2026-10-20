import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { parseCSV } from '../lib/handbook.js';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const imageKey = value => {
  const url = new URL(value);
  return url.hostname.endsWith('pinimg.com') ? url.pathname.split('/').pop().split('.')[0] : url.origin + url.pathname;
};
const isPinterest = value => {
  try { return /(^|\.)pinterest\.(com|[a-z]{2,3}|co\.[a-z]{2})$/.test(new URL(value).hostname); } catch { return false; }
};

export async function compileContent() {
  const original = parseCSV(await read('pinterest-examples.csv'));
  const notes = await read('artstyles-300.md');
  const names = new Map([...notes.matchAll(/^(\d+)\. \*\*(.+?)\*\* — (.+)$/gm)].map(m => [+m[1], m[2]]));
  const curation = JSON.parse(await read('data/curation.json'));
  let unavailable = {};
  try { unavailable = JSON.parse(await read('data/unavailable-sources.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let palettes = {};
  try { palettes = JSON.parse(await read('data/palettes.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let media = {};
  try { media = JSON.parse(await read('data/media-map.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const searches = new Map();
  for (const file of await readdir(new URL('data/searches/', root))) {
    if (!file.endsWith('.json')) continue;
    const record = JSON.parse(await read(`data/searches/${file}`));
    if (record.success && record.data?.images) searches.set(record.styleId, record);
  }
  const styles = {};
  for (const [id, name] of names) {
    const examples = [], seen = new Set();
    const add = item => {
      if (examples.length >= 8 || unavailable[item.image] || !isPinterest(item.url) || !item.image?.startsWith('https://')) return;
      const key = imageKey(item.image);
      if (seen.has(key)) return;
      seen.add(key);
      const stored = media[item.image];
      examples.push({...item, number: examples.length + 1,
        ...(stored ? {originalImage:item.image, image:`https://hamanti.vercel.app/api/images/${stored.id}`, storage:'mongodb', width:stored.width, height:stored.height} : {}),
      });
    };
    for (const row of original.filter(row => +row.style_id === id)) add({
      title: row.title, image: row.image_url, url: row.pinterest_result_url, kind: row.source_kind,
      query: row.search_query, note: row.source_note, provenance: 'Obsidian source',
    });
    const search = searches.get(id);
    const selected = curation[String(id)];
    // New discoveries are published only after their ranks are explicitly selected.
    if (search && selected) for (const rank of selected) {
      const result = search.data.images[rank - 1];
      if (!result) continue;
      add({title: result.title, image: result.imageUrl, url: result.url,
        kind: /\/pin\//.test(result.url) ? 'pin' : 'board_or_idea',
        query: result.query || search.query, note: result.sourceNote || 'Indexed reference; not independently authenticated.',
        provenance: result.provider || search.provider || 'Firecrawl', collected: search.date,
      });
    }
    styles[id] = {name, examples, ...(palettes[id] ? {palette:palettes[id]} : {})};
  }
  const content = { version: 2, target: 8, styles };
  await mkdir(new URL('data/', root), {recursive:true});
  await writeFile(new URL('data/references.json', root), JSON.stringify(content));
  const csv = ['style_id,style_name,expected_examples,examples_found,direct_pin_pages,status'];
  for (const [id, style] of Object.entries(styles)) csv.push(`${id},"${style.name.replaceAll('"','""')}",8,${style.examples.length},${style.examples.filter(e=>e.kind==='pin').length},${style.examples.length===8?'complete':style.examples.length?'partial':'deferred'}`);
  await writeFile(new URL('data/coverage.csv', root), csv.join('\n')+'\n');
  console.log(`${names.size} styles; ${Object.values(styles).reduce((n,s)=>n+s.examples.length,0)} selected references.`);
  return content;
}
