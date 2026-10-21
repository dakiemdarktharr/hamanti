/* Preserve paint order and sub-pixel contours while reducing SVG parsing work.
   Classic worker script; the upstream generator itself remains untouched. */
function compactLandscape(svg) {
  const toleranceSquared = .36;
  function simplify(points) {
    if (points.length < 5) return points;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const ranges = [[0,points.length - 1]];
    while (ranges.length) {
      const [first,last] = ranges.pop(), a = points[first], b = points[last];
      const dx = b[0]-a[0], dy = b[1]-a[1], length = dx*dx+dy*dy;
      let maximum = toleranceSquared, selected = -1;
      for (let i=first+1;i<last;i++) {
        const p=points[i];
        const t=length ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) : 0;
        const distance=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
        if (distance>maximum) { maximum=distance; selected=i; }
      }
      if (selected>=0) { keep[selected]=1; ranges.push([first,selected],[selected,last]); }
    }
    // Never collapse a filled contour into a line.
    const result=points.filter((_,i)=>keep[i]);
    return result.length>=4 ? result : points;
  }
  const output=[];
  let end=0, runStyle, run=[];
  const flush=()=>{if(run.length)output.push(`<path d='${run.join(' ')}' style='${runStyle}'/>`);run=[];runStyle=undefined;};
  const pattern=/<polyline points='([^']*)' style='([^']*)'\s*\/>/g;
  for (const match of svg.matchAll(pattern)) {
    const between=svg.slice(end,match.index);
    // Combining translucent fills changes overlap density, even when their
    // colors match. Keep those paint operations separate.
    const translucent=[...match[2].matchAll(/rgba\([^,]+,[^,]+,[^,]+,([\d.]+)\)/g)].some(color=>+color[1]>0 && +color[1]<1);
    if (between.trim() || translucent || runStyle!==undefined && runStyle!==match[2]) flush();
    output.push(between);
    const points=match[1].trim().split(/\s+/).map(point=>point.split(',').map(Number));
    if (!points.length || points.some(point=>point.length!==2 || point.some(value=>!Number.isFinite(value)))) {
      flush(); output.push(match[0]);
    } else {
      runStyle=match[2]; run.push(`M${simplify(points).map(point=>point.join(',')).join(' ')}`);
    }
    end=match.index+match[0].length;
  }
  flush(); output.push(svg.slice(end));
  return output.join('');
}
