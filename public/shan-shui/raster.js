/* Paint the pinned generator's small SVG vocabulary inside its worker. This is
   deliberately not a general SVG renderer: unsupported markup uses the SVG
   fallback. Paths, wash order and the original green-ink colours are retained. */
function rasterLandscape(svg, x, width, density = 1) {
  const ratio = Math.max(.25, Math.min(density, 2, 8192 / width, Math.sqrt(8e6 / (width * 800))));
  const canvas = new OffscreenCanvas(Math.ceil(width * ratio), Math.ceil(800 * ratio));
  // Software paint keeps thousands of paths off the UI's shared GPU queue.
  // Only the finished pixel surface is handed to the compositor.
  const context = canvas.getContext('2d', {willReadFrequently:true});
  if (!context) throw new Error('Canvas unavailable');
  context.scale(ratio, ratio);
  context.translate(-x, 0);
  context.miterLimit = 4; // SVG's default differs from Canvas's default of 10.
  let end = 0;
  const elements = /<(path|polyline|circle|text)\b([^>]*?)(?:\/>|>([^<]*)<\/text>)/g;
  for (const match of svg.matchAll(elements)) {
    if (svg.slice(end, match.index).trim()) throw new Error('Unsupported SVG');
    end = match.index + match[0].length;
    const attributes = Object.fromEntries([...match[2].matchAll(/([\w-]+)='([^']*)'/g)].map(a => [a[1], a[2]]));
    const style = Object.fromEntries((attributes.style || '').split(';').filter(Boolean).map(item => item.split(':').map(part => part.trim())));
    const fill = style.fill ?? attributes.fill ?? 'black';
    const stroke = style.stroke ?? attributes.stroke ?? 'none';
    const strokeWidth = Number(style['stroke-width'] ?? attributes['stroke-width'] ?? 1);
    context.fillStyle = fill === 'none' ? 'transparent' : fill;
    context.strokeStyle = stroke === 'none' ? 'transparent' : stroke;
    if (match[1] === 'text') {
      context.save();
      for (const transform of (attributes.transform || '').matchAll(/(translate|rotate)\(([^)]+)\)/g)) {
        const values = transform[2].split(/[\s,]+/).map(Number);
        if (transform[1] === 'translate') context.translate(values[0], values[1] || 0);
        else context.rotate(values[0] * Math.PI / 180);
      }
      context.font = `${Number(attributes['font-size'] || 16)}px ${attributes['font-family'] || 'serif'}`;
      context.textAlign = attributes['text-anchor'] === 'middle' ? 'center' : 'start';
      if (fill !== 'none') context.fillText(match[3], Number(attributes.x || 0), Number(attributes.y || 0));
      context.restore();
    } else {
      let path;
      if (match[1] === 'circle') {
        path = new Path2D();
        path.arc(Number(attributes.cx), Number(attributes.cy), Number(attributes.r), 0, 2 * Math.PI);
      } else path = new Path2D(match[1] === 'path' ? attributes.d : `M${attributes.points.trim()}`);
      if (fill !== 'none') context.fill(path);
      if (stroke !== 'none' && strokeWidth > 0) { context.lineWidth = strokeWidth; context.stroke(path); }
    }
  }
  if (svg.slice(end).trim()) throw new Error('Unsupported SVG');
  return canvas.transferToImageBitmap();
}
