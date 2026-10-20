import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Topography from '../vendor/react-bits/Topography.jsx';

// Mount once per visit. Image changes never change this palette.
export function mountBackground(element, palette, paused) {
  const root = createRoot(element);
  const draw = motionPaused => root.render(createElement(Topography, {
    color: palette.accent, opacity: .48, brightness: .8, glow: .15,
    speed: motionPaused ? 0 : .07, morph: motionPaused ? 0 : .035,
    lineCount: 22, lineWidth: .8, elevation: 1.2, tilt: 58,
    mouseInteraction: false, parallax: 0, clickEffect: 'none', markers: 'none',
    intro: !motionPaused, dpr: 1, className: 'reference-topography',
  }));
  draw(paused);
  return { pause: draw, destroy: () => root.unmount() };
}
