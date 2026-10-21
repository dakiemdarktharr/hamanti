// Commit a route only after its cover has completely finished.
export async function coveredNavigation(close, commit, reveal) {
  await close();
  await commit();
  await reveal();
}

export async function mixedCurtains(overlay, commit, reducedMotion = false, alreadyCovered = false) {
  if (reducedMotion) { await commit(); return; }
  const panels = [...overlay.querySelectorAll('.curtain')];
  const iris = overlay.querySelector('.transition-iris');
  const hole = overlay.querySelector('.iris-hole');
  const animations = [];
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  overlay.className = 'transition active curtains';
  overlay.dataset.phase = 'closing';
  try {
    await coveredNavigation(async () => {
      if (alreadyCovered) return;
      // Horizontal wipe in; the stagger ends before the route is touched.
      panels.forEach((panel, i) => {
        const animation = panel.animate([
          {transform:`translateX(${i % 2 ? 102 : -102}%)`},
          {transform:'translateX(0%)'},
        ], {duration:480, delay:i*35, easing:'cubic-bezier(.76,0,.24,1)', fill:'forwards'});
        animations.push(animation);
      });
      await Promise.all(animations.map(animation => animation.finished));
      overlay.dataset.phase = 'covered';
      // Paint the fully opaque final frame before changing the page.
      await frame(); await frame();
    }, commit, async () => {
      const width = innerWidth, height = innerHeight;
      iris.setAttribute('viewBox', `0 0 ${width} ${height}`);
      hole.setAttribute('cx', String(width/2)); hole.setAttribute('cy', String(height/2));
      hole.setAttribute('r', '0');
      iris.style.display = 'block';
      panels.forEach(panel => { panel.style.visibility = 'hidden'; });
      overlay.dataset.phase = 'revealing';
      const radius = Math.ceil(Math.hypot(width,height)/2)+2;
      const animation = hole.animate([{r:'0px'},{r:`${radius}px`}], {
        duration:650, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards',
      });
      animations.push(animation);
      await animation.finished;
    });
  } finally {
    animations.forEach(animation => animation.cancel());
    panels.forEach(panel => { panel.style.visibility = ''; });
    iris.style.display = '';
    overlay.className = 'transition';
    delete overlay.dataset.phase;
  }
}
