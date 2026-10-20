import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Topography from '../vendor/react-bits/Topography.jsx';

const backgrounds = {
  topography: async () => Topography,
  ascii: async () => (await import('../vendor/react-bits/GradientASCII.jsx')).default,
  shards: async () => (await import('../vendor/react-bits/AeroShards.jsx')).default,
  waves: async () => (await import('../vendor/react-bits/PatternWaves.jsx')).default,
  beams: async () => (await import('../vendor/react-bits/Beams.jsx')).default,
};

// Choose once on entry; scrolling, image selection and pause retain this choice.
export async function mountBackground(element, palette, paused) {
  let hasWebGPU = false;
  try { hasWebGPU = Boolean(await navigator.gpu?.requestAdapter()); } catch { /* Other patterns use WebGL. */ }
  const available = Object.keys(backgrounds).filter(name => name !== 'shards' || hasWebGPU);
  const choice = available[crypto.getRandomValues(new Uint32Array(1))[0] % available.length];
  const Component = await backgrounds[choice]();
  if (!element.isConnected) return { pause() {}, destroy() {} };
  element.dataset.background = choice;
  const root = createRoot(element);
  let staticShards = false;
  const renderStaticShards = () => root.render(createElement('svg', {
    viewBox: '0 0 1200 800', preserveAspectRatio: 'xMidYMid slice',
    className: 'reference-atmosphere', 'aria-hidden': true,
  }, ...Array.from({ length: 28 }, (_, i) => createElement('path', {
    key: i, d: 'M0 0 64 14 11 117Z', fill: palette.accent,
    opacity: .08 + (i % 4) * .035,
    transform: `translate(${(i * 347) % 1200} ${(i * 191) % 800}) rotate(${i * 41})`,
  }))));
  const draw = motionPaused => {
    if (staticShards) { renderStaticShards(); return; }
    const common = {
      color: palette.accent, backgroundColor: palette.background, opacity: .55,
      paused: motionPaused, speed: motionPaused ? 0 : .16, intro: false,
      mouseInteraction: false, interactive: false, dpr: 1, grain: 0,
      className: 'reference-atmosphere',
    };
    const props = {
      topography: { morph: motionPaused ? 0 : .025, lineCount: 22, lineWidth: .8, elevation: 1.2, tilt: 58, glow: .12, brightness: .8, parallax: 0, clickEffect: 'none', markers: 'none' },
      ascii: { colors: [palette.background, palette.accent, palette.background], cellSize: 14, density: .6, glyphOpacity: .55, gradientOpacity: .25, flicker: 0, glow: .05, clickEffect: 'none' },
      shards: { shardColor: palette.accent, accentColor: palette.accent, count: 280, depthOfField: .35, glow: .12, markers: 'none', pulseOnClick: false, holdToGather: false, parallax: 0,
        onError: () => { staticShards = true; renderStaticShards(); } },
      waves: { preset: 'silk', pattern: 'dots', spacing: 9, depth: .4, shine: .25 },
      beams: { beamWidth: 180, brightness: .7, glow: .2, quality: .5, depth: .5 },
    };
    root.render(createElement(Component, { ...common, ...props[choice] }));
  };
  draw(paused);
  return { pause: draw, destroy: () => root.unmount() };
}
