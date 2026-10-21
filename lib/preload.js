// Warm the opening 40% of the index, using thumbnails rather than galleries.
export function openingAssets(styles, visible = [], detail = []) {
  const opening = styles.slice(0, Math.ceil(styles.length * .4));
  const urls = [
    ...detail.slice(0, 2).map(example => example.image),
    ...visible.slice(0, 14).map(style => style.examples[0]?.thumbnail || style.examples[0]?.image),
    ...opening.map(style => style.examples[0]?.thumbnail || style.examples[0]?.image),
  ];
  return { styleCount: opening.length, urls: [...new Set(urls.filter(Boolean))] };
}

export async function warmImages(urls, {signal, onProgress = () => {}, load = loadImage, concurrency = 4} = {}) {
  let cursor = 0, settled = 0, failed = 0;
  onProgress(0, urls.length);
  async function worker() {
    while (!signal?.aborted && cursor < urls.length) {
      const index = cursor++;
      try { await load(urls[index], {signal, decode:index < 14}); }
      catch { failed++; }
      if (!signal?.aborted) onProgress(++settled, urls.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency, urls.length)}, worker));
  return {settled, failed, complete:!signal?.aborted && failed === 0};
}

function loadImage(url, {signal, decode}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', abort);
      image.onload = image.onerror = null;
      error ? reject(error) : resolve();
    };
    const abort = () => { finish(new Error('Preload cancelled')); image.src = ''; };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, {once:true});
    image.decoding = 'async';
    image.onload = async () => {
      try { if (decode) await image.decode(); finish(); }
      catch (error) { finish(error); }
    };
    image.onerror = () => finish(new Error('Image unavailable'));
    image.src = url;
  });
}
