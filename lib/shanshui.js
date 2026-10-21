// SVG terrain from Lingdong Huang's shan-shui-inf. Generate in a worker,
// decode ahead of the viewport, then move one composited image while scrolling.
export function createShanShui(container, scroller) {
  const worker = new Worker(new URL('./shan-shui/worker.js', document.baseURI));
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  let stopped = false, busy = false, raf = 0, id = 0, queued, pending;
  let layer, position = 0, scale = 1, width = 1600, requested;
  const urls = new Set();
  let settleReady;
  const ready = new Promise(resolve => { settleReady = resolve; });

  function release(url) { URL.revokeObjectURL(url); urls.delete(url); }
  function place() {
    if (!layer) return;
    layer.image.style.width = `${layer.width * scale}px`;
    layer.image.style.transform = `translate3d(${(layer.x - position) * scale}px,0,0)`;
  }
  function measure() {
    scale = Math.max(1, container.clientHeight) / 800;
    width = container.clientWidth / scale;
    schedule();
  }
  function covers(view, margin = 0) {
    return view && position >= view.x + margin && position + width <= view.x + view.width - margin;
  }
  function send() {
    if (stopped || busy || !queued) return;
    requested = queued; queued = null; busy = true;
    worker.postMessage({ ...requested, id: ++id, seed });
  }
  function update() {
    raf = 0;
    if (stopped || document.body.classList.contains('detail-mode')) return;
    position = scroller.scrollLeft * .52;
    place();
    // Hysteresis avoids generating a new landscape at each small scroll step.
    if (covers(layer, 350) || busy && covers(requested, 200)) queued = null;
    else {
      const x = Math.floor((position - 1024) / 512) * 512;
      queued = { x, width: Math.min(7000, Math.ceil((width + 2560) / 512) * 512) };
    }
    send();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }
  function fail(reason = 'generation') {
    settleReady(false);
    busy = false; stopped = true; worker.terminate();
    container.dataset.landscapeError = reason;
    console.warn(`[hamanti] Landscape unavailable: ${reason}`);
    // A generation failure leaves the last successful view in place.
    if (!layer) container.classList.add('landscape-unavailable');
  }
  worker.onmessage = async ({data}) => {
    if (stopped) return;
    if (data.error) { fail(`generator:${data.reason || 'unknown'}`); return; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${data.width}" height="800" viewBox="${data.x} 0 ${data.width} 800">${data.svg}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
    urls.add(url);
    const image = new Image();
    pending = image;
    image.alt = ''; image.setAttribute('aria-hidden', 'true');
    image.className = 'shan-shui-scroll'; image.decoding = 'async'; image.src = url;
    try {
      await image.decode();
      if (stopped) { release(url); return; }
      const next = { image, url, x:data.x, width:data.width };
      // Do not flash obsolete terrain after a distant search or navigation jump.
      if (covers(next) || !layer) {
        const previous = layer;
        layer = next; place();
        container.replaceChildren(image);
        if (previous) release(previous.url);
        container.classList.add('landscape-ready');
        settleReady(true);
      } else release(url);
    } catch (error) { release(url); fail(`decode:${error.name}`); return; }
    pending = null; busy = false; schedule();
  };
  worker.onerror = event => fail(`worker:${event.message || 'load'}`);
  const resize = new ResizeObserver(measure);
  resize.observe(container);
  scroller.addEventListener('scroll', schedule, {passive:true});
  measure();
  return {
    ready,
    update:schedule,
    pause() {},
    destroy() {
      settleReady(false);
      stopped = true; worker.terminate(); resize.disconnect(); cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', schedule);
      if (pending) pending.src = '';
      container.replaceChildren();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    },
  };
}
