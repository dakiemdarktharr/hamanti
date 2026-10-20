/* Lingdong Huang's MIT-licensed generator is isolated here: its seeded
   Math.random and legacy globals never touch the handbook's browser context. */
importScripts('./engine.js');

let initialized = false;
const paper = '#e9ebe2';
function greenInk(svg) {
  // Retain the original wash densities, with the logo's #222a20 as pure ink.
  return svg.replace(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/g, (_,r,g,b,a) => {
    const density = (1 - (Number(r)+Number(g)+Number(b))/765) * Number(a ?? 1);
    return `rgba(34,42,32,${Math.max(0,Math.min(1,density)).toFixed(3)})`;
  }).replace(/\bwhite\b/g,paper).replace(/\bblack\b/g,'#222a20');
}
self.onmessage = ({data}) => {
  try {
    const {id,x,width,seed} = data;
    if (!Number.isFinite(x) || !Number.isFinite(width) || width < 1 || width > 7000) return;
    if (!initialized) { Prng.seed(seed); initialized = true; }
    // A search jump should generate the new view, not every mountain between.
    if (!MEM.chunks.length || x > MEM.xmax + 1024 || x + width < MEM.xmin - 1024) {
      const start = Math.floor((x - 512)/512)*512;
      MEM.xmin = MEM.xmax = start;
      MEM.chunks = []; MEM.planmtx = [];
    }
    chunkloader(x,x+width);
    const minimum = x-2048, maximum = x+width+2048;
    MEM.chunks = MEM.chunks.filter(chunk => chunk.x > minimum && chunk.x < maximum);
    // Bound both drawing memory and the planning grid during long journeys.
    MEM.xmin = Math.max(MEM.xmin,Math.floor((x-1024)/512)*512);
    MEM.xmax = Math.min(MEM.xmax,Math.ceil((x+width+1024)/512)*512);
    for (const key of Object.keys(MEM.planmtx)) {
      if (+key*5 < minimum || +key*5 > maximum) delete MEM.planmtx[key];
    }
    chunkrender(x,x+width);
    self.postMessage({id,x,width,svg:greenInk(MEM.canv)});
    MEM.canv = '';
  } catch (error) {
    self.postMessage({id:data.id,error:true,reason:error.name});
  }
};
