import { copyFile, mkdir, rm, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { compileContent } from './compile-content.mjs';
import { prepareShanShui } from './prepare-shanshui.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
if (output !== resolve(root, 'dist') || !output.startsWith(root)) throw new Error('Unsafe output directory.');
await rm(output, { recursive: true, force: true });
await compileContent();
// Publish only the handbook and its content, not local tools or workspace files.
const files = [
  'index.html', 'favicon.svg', 'sources.html', 'data/references.json', 'data/coverage.csv',
  'artstyles-300.md', 'pinterest-examples.csv', 'pinterest-coverage.csv',
  'pinterest-examples.md', 'source-notes/README.md',
];

for (const file of files) {
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, file), destination);
}
try { await copyFile(resolve(root, 'data/catalog.json'), resolve(output, 'data/catalog.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await cp(resolve(root, 'public'), output, {recursive:true});
await prepareShanShui(new URL('../dist/', import.meta.url));
await build({
  absWorkingDir: root, entryPoints: ['app.js', 'sources.js'], outdir: resolve(output, 'assets'),
  bundle: true, splitting: true, format: 'esm', target: ['es2022'],
  minify: true, jsx: 'automatic', legalComments: 'linked',
  external: ['/card-back.svg','/card-paper.svg'],
  loader: { '.woff2': 'file', '.woff': 'file' },
  assetNames: 'fonts/[name]-[hash]', chunkNames: '[name]-[hash]',
  define: { 'process.env.NODE_ENV': '"production"' },
});
await mkdir(resolve(output, 'licenses'), {recursive:true});
for (const [pkg, name] of [['@fontsource-variable/syne','syne'], ['@fontsource-variable/manrope','manrope'], ['@fontsource/instrument-serif','instrument-serif'], ['@fontsource/ibm-plex-mono','ibm-plex-mono']]) {
  await copyFile(resolve(root, `node_modules/${pkg}/LICENSE`), resolve(output, `licenses/${name}.txt`));
}
console.log(`Built hamanti with ${files.length} content files and bundled assets.`);
