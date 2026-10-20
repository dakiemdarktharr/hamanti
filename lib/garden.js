// A small, original SVG garden. It is decoration, never a reference example.
export function growGarden(element) {
  const values = crypto.getRandomValues(new Uint32Array(80));
  let cursor = 0;
  const random = () => values[cursor++ % values.length] / 4294967296;
  const colors = ['#d7a18e', '#e4ca8f', '#b8b0cb', '#f2e2be'];
  const stems = Array.from({length: 5 + Math.floor(random() * 3)}, (_, i) => {
    const x = 70 + i * 28 + random() * 14, y = 145 + random() * 17;
    const height = 50 + random() * 75, lean = (random() - .5) * 34;
    const tipX = x + lean, tipY = y - height, color = colors[i % colors.length];
    return `<g class="garden-stem" style="--sway:${i % 2 ? 2 : -2}deg;--delay:-${i * .7}s;transform-origin:${x}px ${y}px">
      <path d="M${x} ${y}Q${x - lean * .6} ${y - height * .5} ${tipX} ${tipY}" fill="none" stroke="#65775c" stroke-width="2"/>
      <path d="M${x} ${y - 22}q-29-30-34-14q9 21 34 14M${x + lean * .3} ${y - 42}q30-29 34-14q-7 20-34 14" fill="${i % 2 ? '#a4b593' : '#829d82'}" stroke="#65775c" stroke-width="1"/>
      <g transform="translate(${tipX} ${tipY}) rotate(${random() * 50})">${Array.from({length:5}, (_,j)=>`<ellipse cx="0" cy="-8" rx="${5 + random() * 3}" ry="11" transform="rotate(${j * 72})" fill="${color}" stroke="#8a806d" stroke-width=".7"/>`).join('')}<circle r="4" fill="#9c785c"/></g></g>`;
  }).join('');
  element.innerHTML = `<svg viewBox="0 0 360 220" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27 169Q44 143 106 151Q177 130 254 155Q333 151 335 175Q299 202 205 196Q105 211 27 178Z" fill="#bca98d"/>
    <path d="M29 164Q76 143 123 151Q198 138 253 153Q309 149 332 170Q281 189 215 179Q135 199 29 172Z" fill="#b7c3a1"/>
    <path d="M88 191Q121 161 193 177T291 160" stroke="#e3cfac" stroke-width="13" stroke-linecap="round"/>
    <path d="M89 193Q139 160 194 177T292 160" stroke="#a88c70" stroke-width="1" stroke-linecap="round" stroke-dasharray="2 9"/>
    ${stems}
    <path d="M53 168q2-14 10-13l4 12M302 174l3-11q9-7 12 9" fill="#a8afa6" stroke="#7f8d7c"/>
    <path d="m34 177 8 3m278 7 14-3m-232 12 9 1" stroke="#9e8e71" stroke-linecap="round"/>
  </svg>`;
}
