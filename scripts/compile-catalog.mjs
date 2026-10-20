import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
export const isFullHD = item =>
  Number.isInteger(item.width) && Number.isInteger(item.height) &&
  ((item.width >= 1920 && item.height >= 1080) || (item.width >= 1080 && item.height >= 1920));
export const hasPeopleReview = item => ['no-real-people', 'posed-model'].includes(item.peopleReview);

export async function compileCatalog() {
  const catalog = await read('data/catalog.json');
  if (catalog.styles.length !== 300 || new Set(catalog.styles.map(s => s.name.toLowerCase())).size !== 300)
    throw new Error('The revised catalog must contain 300 distinct named entries.');
  const selected = await read('data/hd-selection.json');
  const media = await read('data/hd-media-map.json');
  const styles = {};
  for (const style of catalog.styles) {
    const seen = new Set();
    const examples = (selected[style.name] || []).filter(item => {
      const stored = media[item.imageUrl];
      if (!stored || !isFullHD(stored) || !isFullHD(item) || item.reviewStatus !== 'approved' || !hasPeopleReview(item)) return false;
      if (seen.has(stored.checksum || stored.id)) return false;
      let source;
      try { source = new URL(item.url); } catch { return false; }
      if (!/(^|\.)pinterest\.(com|[a-z]{2,3}|co\.[a-z]{2})$/.test(source.hostname)) return false;
      seen.add(stored.checksum || stored.id);
      return true;
    }).slice(0, 8).map((item, index) => {
      const stored = media[item.imageUrl];
      return {
        number: index + 1, title: item.title, url: item.url,
        image: `https://hamanti.vercel.app/api/images/${stored.id}`,
        originalImage: item.imageUrl, width: stored.width, height: stored.height,
        kind: /\/pin\//.test(new URL(item.url).pathname) ? 'pin' : 'board_or_idea',
        query: item.query || style.name, storage: 'mongodb', provenance: item.provider || 'Pinterest via TinyFish',
        collected: item.collectedAt, nativeFullHD: true, peopleReview: item.peopleReview,
      };
    });
    styles[style.id] = {
      name: style.name, examples,
      ...(examples[0] && media[examples[0].originalImage].palette ? { palette: media[examples[0].originalImage].palette } : {}),
    };
  }
  const content = { version: 3, target: 8, minimumResolution: 'native-full-hd', styles };
  await writeFile(new URL('data/references.json', root), JSON.stringify(content));
  const csv = ['style_id,style_name,expected_examples,examples_found,direct_pin_pages,status'];
  for (const [id, style] of Object.entries(styles)) {
    const n = style.examples.length;
    csv.push(`${id},"${style.name.replaceAll('"', '""')}",8,${n},${style.examples.filter(e => e.kind === 'pin').length},${n === 8 ? 'complete' : n ? 'partial' : 'deferred'}`);
  }
  await writeFile(new URL('data/coverage.csv', root), csv.join('\n') + '\n');
  console.log(`300 revised directions; ${Object.values(styles).reduce((n, s) => n + s.examples.length, 0)} verified Full HD references.`);
  return content;
}
