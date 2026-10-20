import { copyFile, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This operation only reads the vault. The app consumes the workspace copies.
const source = resolve(process.argv[2] || 'D:/notes/vault_1/Art Style Handbook');
const destination = fileURLToPath(new URL('../', import.meta.url));
const names = ['artstyles-300.md', 'pinterest-examples.md', 'pinterest-examples.csv', 'pinterest-coverage.csv'];
// Read all inputs before changing any workspace files.
await Promise.all([...names, 'README.md'].map(name => readFile(resolve(source, name))));
for (const name of names) await copyFile(resolve(source, name), resolve(destination, name));
await mkdir(resolve(destination, 'source-notes'), { recursive: true });
await copyFile(resolve(source, 'README.md'), resolve(destination, 'source-notes/README.md'));
console.log(`Copied ${names.length} content files and preserved the vault README in source-notes/. The vault was not modified.`);
