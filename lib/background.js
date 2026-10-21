// Small SVG compositions. No canvas, graphics context, render loop or 3D runtime.
const svgNS = 'http://www.w3.org/2000/svg';
const names = ['topography','ascii','shards','waves','beams'];
export async function mountBackground(element, palette, paused) {
  const choice = names[crypto.getRandomValues(new Uint32Array(1))[0] % names.length];
  element.dataset.background = choice;
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 1200 800');
  svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('reference-atmosphere','svg-atmosphere');
  svg.style.color = palette.accent;
  const gradientId = `atmosphere-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  const paths = [];
  if (choice === 'topography' || choice === 'waves') {
    const count = choice === 'topography' ? 26 : 14;
    for (let line=0;line<count;line++) {
      const points = Array.from({length:41},(_,i) => {
        const x=i*36-120;
        const y=line*(800/count)+Math.sin(i*.25+line*.19)*48+Math.cos(i*.47-line*.12)*19;
        return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      paths.push(`<path d="${points}" fill="none" stroke="currentColor" stroke-width="${choice==='waves'?1.5:.8}" opacity=".22"/>`);
    }
  } else if (choice === 'ascii') {
    const glyphs='.:+*~';
    for(let y=0;y<16;y++) {
      const text=Array.from({length:55},(_,x)=>glyphs[Math.floor((Math.sin(x*.22+y*.3)+1)*2.3)%glyphs.length]).join(' ');
      paths.push(`<text x="-20" y="${y*54}" fill="currentColor" opacity=".15" font-family="monospace" font-size="14">${text}</text>`);
    }
  } else if (choice === 'shards') {
    for(let i=0;i<18;i++) paths.push(`<path d="M0 0 98 25 14 180Z" fill="currentColor" opacity="${.035+(i%4)*.012}" transform="translate(${i*347%1200} ${i*191%800}) rotate(${i*41})"/>`);
  } else {
    for(let i=0;i<8;i++) paths.push(`<path d="M${i*180-180} -100  ${i*180+200} 900" stroke="currentColor" stroke-width="${20+i%3*15}" opacity=".035"/>`);
  }
  svg.innerHTML=`<defs><radialGradient id="${gradientId}"><stop stop-color="currentColor" stop-opacity=".15"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><ellipse cx="700" cy="380" rx="640" ry="500" fill="url(#${gradientId})"/><g class="atmosphere-lines">${paths.join('')}</g>`;
  element.replaceChildren(svg);
  const pause = value => svg.classList.toggle('is-paused',value || document.hidden);
  let motionPaused=paused;
  const visibility=()=>pause(motionPaused);
  document.addEventListener('visibilitychange',visibility);
  pause(paused);
  return {pause(value){motionPaused=value;pause(value);},destroy(){document.removeEventListener('visibilitychange',visibility);svg.remove();}};
}
