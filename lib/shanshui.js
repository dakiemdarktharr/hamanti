// SVG terrain from Lingdong Huang's shan-shui-inf, drawn off the main thread.
export function createShanShui(container, scroller) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','xMinYMid slice');
  svg.classList.add('shan-shui-scroll');
  container.replaceChildren(svg);
  const worker = new Worker(new URL('./shan-shui/worker.js',document.baseURI));
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  let busy = false, stopped = false, requestId = 0, requestedKey = '', paintedKey = '';
  let position = 0, width = 1600, queued = null, raf = 0;
  function send() {
    if (busy || !queued || stopped) return;
    busy = true;
    const request = queued; queued = null;
    requestedKey = request.key;
    worker.postMessage({...request,id:++requestId,seed});
  }
  worker.onmessage = ({data}) => {
    busy = false;
    if (stopped) return;
    if (data.error) {
      stopped = true; worker.terminate();
      container.classList.add('landscape-unavailable'); return;
    }
    svg.innerHTML = data.svg;
    paintedKey = requestedKey;
    container.classList.add('landscape-ready');
    schedule();
  };
  worker.onerror = () => { stopped = true; busy = false; worker.terminate(); container.classList.add('landscape-unavailable'); };
  function update() {
    raf = 0;
    if (stopped || document.body.classList.contains('detail-mode')) return;
    const height = Math.max(1,container.clientHeight);
    width = Math.min(4200,Math.max(600,container.clientWidth / height * 800));
    position = scroller.scrollLeft * .52;
    svg.setAttribute('viewBox',`${position.toFixed(2)} 0 ${width.toFixed(2)} 800`);
    const start = Math.floor(position/512)*512-512;
    const span = Math.ceil(width/512)*512+1536;
    const key = `${start}:${span}`;
    queued = key === paintedKey || busy && key === requestedKey ? null : {x:start,width:span,key};
    send();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }
  scroller.addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  schedule();
  return {
    update:schedule,
    // No autonomous movement: terrain only follows the reader's scrolling.
    pause() {},
    destroy() {
      stopped = true; worker.terminate(); cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll',schedule); removeEventListener('resize',schedule);
      container.replaceChildren();
    },
  };
}
