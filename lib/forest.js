import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyPastelMaterials } from './pastel.js';
import { createGround, createCrossingPath, createCloud, pathDepth } from './terrain.js';

// Only a viewport-sized scene is rendered. A seeded world is recycled as the
// reader travels, so the cost does not grow with all 300 cards.
export async function createForest(container) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'forest-canvas';
  const painting = document.createElement('div');
  painting.className = 'pastel-painting';
  painting.setAttribute('aria-hidden', 'true');
  painting.style.setProperty('--paint-image', `url("${new URL('./ui/pastel-landscape.svg', document.baseURI).href}")`);
  painting.style.visibility = renderer.domElement.style.visibility = 'hidden';
  container.replaceChildren(painting, renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, .1, 100);
  camera.position.set(0, 5, 14);
  camera.lookAt(0, 2, 0);
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0xa4b7aa, 2));
  const sun = new THREE.DirectionalLight(0xffead6, 1.6);
  sun.position.set(-4, 7, 8);
  scene.add(sun);
  const loader = new GLTFLoader();
  const types = ['pine', 'birch', 'fern', 'rock', 'fox', 'deer', 'bird', 'butterfly'];
  let models;
  try { models = Object.fromEntries(await Promise.all(types.map(async name => [
    name, (await loader.loadAsync(new URL(`./models/${name}.glb`, document.baseURI).href)).scene
  ]))); } catch (error) { renderer.dispose(); container.replaceChildren(); throw error; }
  applyPastelMaterials(models);
  let seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const random = () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  const plants = [];
  for (let i = 0; i < 30; i++) {
    const name = ['pine', 'birch', 'fern', 'rock'][Math.floor(random() * 4)];
    const plant = models[name].clone(true);
    const model = new THREE.Group();
    const soil = createGround(random, name === 'pine' || name === 'birch' ? 1.55 : .95);
    applyPastelMaterials({ground:soil});
    plant.position.y = .04;
    model.add(soil,plant);
    const side = i % 2 ? 1 : -1;
    const scale = .35 + random() * .75;
    model.scale.setScalar(scale);
    model.rotation.y = random() * Math.PI * 2;
    scene.add(model);
    plants.push({ model, plant, side, x: 6.8 + random() * 1.7, phase: random() * 24, depth: random() * 4 - 3, scale });
  }
  const crossing = createCrossingPath();
  applyPastelMaterials({ground:crossing});
  crossing.position.y = -3.5; scene.add(crossing);
  const creatures = [];
  for (let i = 0; i < 14; i++) {
    const name = i < 4 ? 'bird' : i < 8 ? 'butterfly' : i === 8 ? 'fox' : i === 9 ? 'deer' : 'cloud';
    const ground = name === 'fox' || name === 'deer';
    const model = name === 'cloud' ? createCloud(random) : models[name].clone(true);
    if (name === 'cloud') applyPastelMaterials({sky:model});
    else model.scale.setScalar(ground ? .55 : .65 + random() * .4);
    scene.add(model);
    creatures.push({ model, name, ground, phase: random() * 28, pace: ground ? .32 : name === 'cloud' ? .08 + random()*.09 : .45 + random() * .4,
      y: ground ? -3.5 : -1 + random() * 7, direction: i % 2 ? 1 : -1 });
  }
  let stopped = false, paused = false, visible = false, raf, time = 0, previous = performance.now(), lastDraw = 0, lastScroll = -1;
  const resize = () => {
    const aspect = innerWidth / innerHeight;
    renderer.setSize(innerWidth, innerHeight);
    camera.left = -8;
    camera.right = 8;
    camera.top = 8 / aspect;
    camera.bottom = -8 / aspect;
    camera.updateProjectionMatrix();
    lastScroll = -1;
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    painting.style.visibility = renderer.domElement.style.visibility = visible ? 'visible' : 'hidden';
    if (visible) lastScroll = -1;
  }, { rootMargin: '100px' });
  observer.observe(container.closest('.journey'));
  const draw = now => {
    if (stopped) return;
    raf = requestAnimationFrame(draw);
    const dt = Math.min((now - previous) / 1000, .05);
    previous = now;
    if (!visible || document.hidden || document.body.classList.contains('detail-mode')) return;
    if (!paused) time += dt;
    if (now - lastDraw < 32 || (paused && lastScroll === scrollY)) return;
    lastDraw = now; lastScroll = scrollY;
    const journeyBounds = container.closest('.journey').getBoundingClientRect();
    const clip = `inset(${Math.max(0, journeyBounds.top)}px 0 ${Math.max(0, innerHeight - journeyBounds.bottom)}px 0)`;
    renderer.domElement.style.clipPath = clip;
    painting.style.clipPath = clip;
    const travel = -journeyBounds.top / Math.max(innerHeight, 1) * 4;
    painting.style.setProperty('--paint-x', `${Math.sin(time * .08) * 12}px`);
    painting.style.setProperty('--paint-y', `${Math.cos(time * .06 + travel * .12) * 16}px`);
    painting.style.setProperty('--paint-tilt', `${Math.sin(time * .045) * .6}deg`);
    plants.forEach(({ model, plant, side, x, phase, depth, scale }) => {
      const y = ((phase + travel) % 24 + 24) % 24 - 12;
      model.position.set(side * (innerWidth < 700 ? x + .8 : x), y, depth);
      model.scale.setScalar(scale * Math.min(1, (12 - Math.abs(y)) / 2));
      plant.rotation.z = Math.sin(time * .4 + phase) * .018;
    });
    creatures.forEach(({ model, name, ground, phase, pace, y, direction }) => {
      const journey = (time * pace + phase) % (ground ? 44 : 28);
      const x = (journey - 14) * direction;
      model.position.set(x, y + (ground ? .025 : Math.sin(time * .6 + phase) * .4), ground ? pathDepth(x) : -1);
      model.rotation.y = direction < 0 ? Math.PI : 0;
      model.traverse(part => {
        if (part.name.startsWith('wing_')) part.rotation.x = Math.sin(time * (name === 'bird' ? 7 : 18) + phase) * .65 * (part.name === 'wing_left' ? 1 : -1);
        if (part.name.startsWith('leg_')) part.rotation.z = Math.sin(time * 6 + Number(part.name.slice(-1)) * Math.PI / 2) * .35;
      });
    });
    renderer.render(scene, camera);
  };
  resize(); addEventListener('resize', resize);
  raf = requestAnimationFrame(draw);
  return {
    pause(value) { paused = value; lastScroll = -1; },
    destroy() {
      stopped = true; cancelAnimationFrame(raf); observer.disconnect(); removeEventListener('resize', resize);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) [object.material].flat().forEach(m=>materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); container.replaceChildren();
    }
  };
}
