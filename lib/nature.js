const wrap = content => `<svg viewBox="0 0 240 320" fill="none" stroke="currentColor" stroke-width="1.2" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;

// Original line drawings: scenery, never style references.
export function fern() {
  let paths = '<path d="M118 320C112 220 130 116 118 12"/>';
  for (let i = 0; i < 15; i++) {
    const y = 34 + i * 17, width = 10 + Math.sin(i / 16 * Math.PI) * 91;
    for (const side of [-1, 1]) {
      const x = 120 + side * width;
      paths += `<path d="M120 ${y + 32}Q${x} ${y + 28} ${x} ${y - 6}Q${120 + side * width * .4} ${y + 4} 120 ${y + 32}M120 ${y + 32}L${x} ${y - 6}"/>`;
      for (let k = 1; k < 4; k++) paths += `<path d="M${120 + side * width * k / 4} ${y + 32 - 38 * k / 4}l${side * 5} -12"/>`;
    }
  }
  return wrap(paths);
}
export function tree() {
  let paths = '<path d="M119 320L122 29M113 320l9-94 8 94"/>';
  for (let i = 0; i < 10; i++) {
    const y = 35 + i * 23, width = 13 + i * 9;
    for (const side of [-1, 1]) {
      paths += `<path d="M121 ${y}Q${121 + side * width * .5} ${y + 38} ${121 + side * width} ${y + 47}M121 ${y + 8}Q${121 + side * width * .5} ${y + 40} ${121 + side * width * .9} ${y + 48}"/>`;
      for (let k = 1; k < 5; k++) paths += `<path d="M${121 + side * width * k / 5} ${y + 40 * k / 5}l${side * (6 + i)} 18"/>`;
    }
  }
  return wrap(paths);
}
const bird = '<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12Q32 2 50 38Q72 8 98 14M50 38l-2 7"/></svg>';
const cloud = '<svg viewBox="0 0 230 90" fill="none" stroke="currentColor"><path d="M4 65q12-25 38-19 1-32 32-30 20-26 53-5 27-3 37 24 36-6 42 25 20 0 20 12H4M30 58q30-10 54 0m20-26q23-8 39 8M50 78h160M16 83h111"/></svg>';
const insect = '<svg viewBox="0 0 70 100" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M35 19v70M35 31Q5 2 4 28t31 10Q6 40 8 55t27-14Q66 65 66 46T35 38Q68 33 65 13T35 31M31 17l-9-9m16 10 9-12"/><circle cx="35" cy="18" r="4"/></svg>';

export function createLandscape(container, count) {
  container.replaceChildren();
  for (let i = 0; i < Math.max(4, Math.ceil(count / 5)); i++) {
    const element = document.createElement('div');
    const kind = i % 9 === 4 ? 'bird' : i % 9 === 7 ? 'cloud' : i % 9 === 2 ? 'insect' : i % 2 ? 'fern' : 'tree';
    element.className = `flora ${i % 2 ? 'right' : 'left'} ${kind}`;
    element.style.top = `${i * 100 / Math.max(4, Math.ceil(count / 5))}%`;
    element.innerHTML = kind === 'bird' ? bird : kind === 'cloud' ? cloud : kind === 'insect' ? insect : kind === 'fern' ? fern() : tree();
    container.append(element);
  }
  return () => {
    const height = innerHeight;
    for (const [index, element] of [...container.children].entries()) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > height + 300) continue;
      const progress = Math.max(-1, Math.min(1, (height / 2 - rect.top) / height));
      const side = index % 2 ? -1 : 1;
      const flying = element.classList.contains('bird') || element.classList.contains('insect');
      element.style.translate = `${flying ? side * progress * 180 : side * Math.abs(progress) * -25}px ${progress * -45}px`;
      element.style.scale = `${Math.max(.6, 1 - Math.abs(progress) * .3)}`;
      element.style.rotate = `${flying ? progress * 15 : Math.sin(progress * 3) * 4}deg`;
    }
  };
}
