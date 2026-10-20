import { animate, stagger } from 'motion';

document.addEventListener('click', async event => {
  const link = event.target.closest('[data-home]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { paused ||= localStorage.getItem('hamanti-motion') === 'paused'; } catch {}
  if (paused) return;
  event.preventDefault();
  const overlay = document.querySelector('#source-transition');
  overlay.className = 'transition active curtains';
  const curtains = [...overlay.querySelectorAll('.curtain')];
  curtains.forEach((curtain, index) => { curtain.style.transformOrigin = index % 2 ? 'bottom' : 'top'; });
  await animate(curtains, {scaleY:[0,1]}, {duration:.45, delay:stagger(.035), ease:[.76,0,.24,1]});
  location.assign(link.href);
});
