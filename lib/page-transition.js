// Commit a route only after its cover has completely finished.
export async function coveredNavigation(close, commit, reveal) {
  await close();
  await commit();
  await reveal();
}

export function prepareHomeReturn(overlay) {
  overlay.className = 'transition active home-return';
  overlay.querySelector('.home-wipe').style.transform = 'scaleX(1)';
}

// Independent implementation of the public Motion demo's Wipe → Iris sequence:
// one left-to-right cover, followed by a solid disc shrinking to its centre.
export async function mixedCurtains(overlay, commit, reducedMotion = false, alreadyCovered = false) {
  if (reducedMotion) { await commit(); return; }
  const wipe = overlay.querySelector('.home-wipe');
  const iris = overlay.querySelector('.home-iris');
  const circle = overlay.querySelector('.iris-cover');
  const animations = [];
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  overlay.className = 'transition active home-return';
  overlay.dataset.phase = 'closing';
  try {
    await coveredNavigation(async () => {
      if (alreadyCovered) return;
      const animation = wipe.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}], {
        duration:500, easing:'cubic-bezier(.76,0,.24,1)', fill:'forwards',
      });
      animations.push(animation);
      await animation.finished;
      overlay.dataset.phase = 'covered';
      // Paint the fully opaque final frame before changing the page.
      await frame(); await frame();
    }, commit, async () => {
      const width = innerWidth, height = innerHeight;
      iris.setAttribute('viewBox', `0 0 ${width} ${height}`);
      circle.setAttribute('cx', String(width/2)); circle.setAttribute('cy', String(height/2));
      const radius = Math.ceil(Math.hypot(width,height)/2)+2;
      circle.setAttribute('r', String(radius));
      iris.style.display = 'block';
      wipe.style.visibility = 'hidden';
      overlay.dataset.phase = 'revealing';
      const animation = circle.animate([{r:`${radius}px`},{r:'0px'}], {
        duration:650, easing:'cubic-bezier(.76,0,.24,1)', fill:'forwards',
      });
      animations.push(animation);
      await animation.finished;
    });
  } finally {
    animations.forEach(animation => animation.cancel());
    wipe.style.visibility = ''; wipe.style.transform = '';
    iris.style.display = '';
    overlay.className = 'transition';
    delete overlay.dataset.phase;
  }
}
