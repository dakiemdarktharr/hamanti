import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';

// Keep the upstream algorithms intact, but omit its page, downloader and UI.
// The resulting classic script runs only in an isolated Web Worker.
export async function prepareShanShui(output) {
  const source = await readFile(new URL('../vendor/shan-shui-inf/index.html', import.meta.url), 'utf8');
  const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const engine = [0,2,3,4,5].map(index => {
    let body = scripts[index][1];
    if (index === 5) body = body.slice(0, body.indexOf('  document.addEventListener'));
    return body.replaceAll('window.btoa', 'self.btoa').replace(/^\s*console\.log\([^\n]*\);\s*$/gm, '');
  }).join('\n');
  const folder = new URL('shan-shui/', output);
  await mkdir(folder, {recursive:true});
  await writeFile(new URL('engine.js',folder), `/*!
 * Shan Shui Inf — Copyright (c) 2018 Lingdong Huang, MIT.
 * https://github.com/LingDong-/shan-shui-inf
 * Pinned commit: 9f754d2b2e73495db7883d4d4055a7b0903b0454
 * Adapted for hamanti: extracted generator; worker-safe btoa; no page UI.
 */\n${engine}\n`);
  await copyFile(new URL('../vendor/shan-shui-inf/LICENSE',import.meta.url),new URL('LICENSE.txt',folder));
}
