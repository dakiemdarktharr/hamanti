import {landscapePlan} from './landscape-plan.js';

// Prepare every tile before ready resolves. Scrolling never waits for terrain
// generation, SVG parsing or a decode. Only the visible cached canvases attach
// to the compositor; the rest stay detached and ready for distant jumps.
export function createShanShui(container,scroller,{getMaxScroll=()=>scroller.scrollWidth-scroller.clientWidth,onProgress=()=>{}}={}){
  const worker=new Worker(new URL('./shan-shui/worker.js',document.baseURI));
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  let stopped=false,complete=false,raf=0,scale=(container.clientHeight||innerHeight-76)/800,index=0;
  const plan=landscapePlan(getMaxScroll(),container.clientWidth||innerWidth,scale,devicePixelRatio||1),cache=[];
  let settleReady;const ready=new Promise(resolve=>{settleReady=resolve;});
  container.dataset.totalTiles=String(plan.tiles.length);container.dataset.preparedTiles='0';
  function place(){
    raf=0;if(stopped||document.body.classList.contains('detail-mode'))return;
    scale=Math.max(1,container.clientHeight)/800;
    const position=Math.max(0,Math.min(1,scroller.scrollLeft/Math.max(1,getMaxScroll())))*plan.maxPosition;
    const view=container.clientWidth/scale;
    for(const tile of cache){
      const visible=tile.x+tile.width>=position-512&&tile.x<=position+view+512;
      if(visible){
        if(!tile.image.isConnected)container.append(tile.image);
        tile.image.style.width=tile.width*scale+'px';
        tile.image.style.transform='translate3d('+((tile.x-position)*scale)+'px,0,0)';
      }else tile.image.remove();
    }
    container.dataset.landscapePosition=position.toFixed(2);
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(place);}
  function fail(reason){
    stopped=true;worker.terminate();settleReady(false);
    container.dataset.landscapeError=reason;
    console.warn('[hamanti] Landscape unavailable: '+reason);
  }
  function send(){
    if(stopped)return;
    const tile=plan.tiles[index];
    // Paint an extra 512 units on either side, then retain only the core.
    // Neighbouring tiles therefore share the generator's boundary context.
    worker.postMessage({id:index+1,x:tile.x-512,width:tile.width+1024,density:plan.density,seed});
  }
  worker.onmessage=async({data})=>{
    if(stopped){data.bitmap?.close();return;}
    if(data.error){fail('generator:'+data.reason);return;}
    const tile=plan.tiles[index],image=document.createElement('canvas');
    image.className='shan-shui-scroll';image.setAttribute('aria-hidden','true');
    image.width=Math.ceil(tile.width*plan.density);image.height=Math.ceil(800*plan.density);
    const context=image.getContext('2d');
    try{
      if(data.bitmap){
        const ratio=data.bitmap.width/data.width;
        context.drawImage(data.bitmap,512*ratio,0,tile.width*ratio,data.bitmap.height,0,0,image.width,image.height);
        data.bitmap.close();
      }else{
        const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+data.width+'" height="800" viewBox="'+data.x+' 0 '+data.width+' 800">'+data.svg+'</svg>';
        const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
        try{const decoded=new Image();decoded.src=url;await decoded.decode();context.drawImage(decoded,512,0,tile.width,800,0,0,image.width,image.height);}
        finally{URL.revokeObjectURL(url);}
      }
      cache.push({...tile,image});index++;
      container.dataset.preparedTiles=String(index);
      onProgress(index,plan.tiles.length);place();
      if(index===plan.tiles.length){
        complete=true;worker.terminate();container.classList.add('landscape-ready');
        container.dataset.coverage='all-300';settleReady(true);
      }else send();
    }catch(error){data.bitmap?.close();fail('paint:'+error.name);}
  };
  worker.onerror=event=>fail('worker:'+event.message);
  const resize=new ResizeObserver(schedule);resize.observe(container);
  scroller.addEventListener('scroll',schedule,{passive:true});send();
  return {ready,update:schedule,hold(){},pause(){},get complete(){return complete;},
    destroy(){stopped=true;worker.terminate();settleReady(false);resize.disconnect();cancelAnimationFrame(raf);scroller.removeEventListener('scroll',schedule);for(const tile of cache){tile.image.remove();tile.image.width=1;}cache.length=0;}};
}
