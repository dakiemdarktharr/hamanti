// Cache the entire scroll journey before revealing the page. Tile resolution
// is chosen from an explicit 96 MiB pixel budget, rather than multiplying
// hundreds of full-DPR canvases on high-density displays.
export function landscapePlan(maxScroll,viewport,scale,dpr=1){
  const tileWidth=2048,maxPosition=Math.max(0,maxScroll)*.52;
  const end=Math.ceil((maxPosition+Math.max(4096,viewport/scale))/tileWidth)*tileWidth;
  const density=Math.max(.25,Math.min(1.25,scale*Math.min(2,dpr),Math.sqrt(96*1024*1024/(end*800*4))));
  return {maxPosition,density,tiles:Array.from({length:Math.max(1,end/tileWidth)},(_,i)=>({x:i*tileWidth,width:tileWidth}))};
}
