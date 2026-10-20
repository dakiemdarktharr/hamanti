import {readFile} from 'node:fs/promises';

export async function requirePinterestCollection() {
  const policy = JSON.parse(await readFile(new URL('../data/collection-policy.json',import.meta.url),'utf8'));
  if (policy.mode !== 'pinterest') throw new Error('Pinterest collection has stopped. The next collection comes from the user-supplied folders.');
}
