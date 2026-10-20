import './styles.css';
import { animate, hover, press, stagger } from 'motion';
import Lenis from 'lenis';
import { loadHandbook } from './lib/handbook.js';
import { createLandscape, fern } from './lib/nature.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = value => { try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const pad = value => String(value).padStart(3, '0');
const clamp = value => Math.max(0, Math.min(1, value));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 900px)');
let savedPause = false;
try { savedPause = localStorage.getItem('hamanti-motion') === 'paused'; } catch {}
let paused = reduced.matches || savedPause;
let handbook, currentStyle, background, lenis, galleryCleanup, galleryUpdate, sceneryUpdate, homeScroll = 0, lastStyleId;
let routeVersion = 0, navigationBusy = false, controlsCleanup = [], titleTimer, frameRequest;
const filters = { query: '', group: 'all', coverage: 'all' };
let frozenPalette;

function smoothTo(target, options = {}) {
  if (lenis && !paused) lenis.scrollTo(target, { duration: 1.1, force: options.immediate === true, ...options });
  else window.scrollTo({ top: typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY, behavior: 'instant' });
}
function setupMotion() {
  lenis?.destroy();
  lenis = !paused ? new Lenis({ autoRaf: true, duration: 1.1, smoothWheel: true, syncTouch: false, anchors: false }) : null;
  document.body.classList.toggle('motion-paused', paused);
  $('#motion-toggle').textContent = paused ? 'Motion paused' : 'Pause motion';
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  background?.pause(paused);
  if (currentStyle) setupGallery();
  requestUpdate();
}
function bindControls() {
  controlsCleanup.forEach(dispose => dispose());
  const elements = [...document.querySelectorAll('button:not(.reference-open), .down-link, .index-link, .back-link')];
  controlsCleanup = [
    hover(elements, element => {
      if (paused || element.disabled) return;
      animate(element, { y: -2 }, { duration: .18 });
      return () => animate(element, { y: 0 }, { duration: .18 });
    }),
    press(elements, element => {
      if (paused || element.disabled) return;
      animate(element, { scale: .96 }, { type: 'spring', stiffness: 700, damping: 35 });
      return () => animate(element, { scale: 1 }, { type: 'spring', stiffness: 500, damping: 25 });
    }),
  ];
}
function typeTitle() {
  clearTimeout(titleTimer);
  const element = $('#type-title');
  element.textContent = 'hamanti';
  if (paused) return;
  const words = ['anti', 'hamanti'];
  let index = 0;
  const tick = () => {
    if (paused || currentStyle || document.hidden) { element.textContent = 'hamanti'; return; }
    const target = words[index], current = element.textContent;
    if (current !== target) {
      const shared = [...current].findIndex((letter, i) => target[i] !== letter);
      if (shared !== -1 || current.length > target.length) element.textContent = current.slice(0, -1);
      else element.textContent = target.slice(0, current.length + 1);
      titleTimer = setTimeout(tick, current.length > target.length || shared !== -1 ? 60 : 100 + Math.random() * 55);
    } else if (++index < words.length) titleTimer = setTimeout(tick, 1400);
  };
  titleTimer = setTimeout(tick, 3800);
}
function introWords() {
  const element = $('#intro-copy'), text = element.textContent;
  element.setAttribute('aria-label', text);
  element.innerHTML = text.split(' ').map(word => `<span class="intro-word" aria-hidden="true">${escape(word)} </span>`).join('');
}
function requestUpdate() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = null;
    if (!currentStyle) {
      const intro = $('.introduction').getBoundingClientRect();
      const progress = clamp((innerHeight * .8 - intro.top) / Math.max(1, intro.height * .8));
      const words = [...document.querySelectorAll('.intro-word')];
      words.forEach((word, index) => { word.style.opacity = paused ? 1 : .25 + .75 * clamp(progress * (words.length + 3) - index); });
      if (!paused) sceneryUpdate?.();
    } else galleryUpdate?.();
    const footer = $('#footer').getBoundingClientRect();
    const footerProgress = clamp((innerHeight - footer.top) / Math.min(innerHeight, footer.height));
    $('.footer-inner').style.opacity = paused ? 1 : .4 + .6 * footerProgress;
    $('.footer-inner').style.transform = paused ? 'none' : `translateY(${(1 - footerProgress) * -90}px)`;
  });
}
function renderIndex() {
  const query = filters.query.toLocaleLowerCase().trim(), words = query.split(/\s+/).filter(Boolean);
  const styles = handbook.styles.filter(style =>
    (filters.group === 'all' || style.group === filters.group) &&
    (filters.coverage === 'all' || (filters.coverage === 'complete' ? style.found === 8 : style.found < 8)) &&
    words.every(word => `${style.id} ${style.name} ${style.description} ${style.groupName}`.toLocaleLowerCase().includes(word))
  );
  $('#style-index').innerHTML = handbook.groups.map(group => {
    const members = styles.filter(style => style.group === group.id);
    if (!members.length) return '';
    return `<section class="style-group" data-group="${group.id}" aria-labelledby="group-${group.id}">
      <div class="group-heading"><span>${String(group.id).padStart(2,'0')}</span><h3 id="group-${group.id}">${escape(group.name)}</h3><span class="group-size">${members.length}</span></div>
      ${members.map(style => `<a href="#/style/${style.id}" class="style-row" data-style="${style.id}" aria-label="${escape(style.name)}${style.found < 8 ? ', examples pending' : ''}">
        <span class="style-number">${pad(style.id)}</span><span class="style-name">${escape(style.name)}</span>
        <span class="style-description">${escape(style.description)}</span>
        <span class="style-coverage">${style.found < 8 ? `${style.found}/8<br>pending` : '08 refs'}</span><span class="style-arrow" aria-hidden="true">↗</span>
      </a>`).join('')}
    </section>`;
  }).join('');
  $('#result-count').textContent = `${styles.length} ${styles.length === 1 ? 'style' : 'styles'}${query || filters.group !== 'all' || filters.coverage !== 'all' ? ' / 300' : ' — follow your curiosity'}`;
  $('#empty').hidden = styles.length > 0;
  sceneryUpdate = createLandscape($('#landscape'), styles.length);
  lenis?.resize();
  requestUpdate();
}
function sourceLabel(example) { return example.kind === 'pin' ? 'Pin' : 'Board / idea'; }
function renderDetail(style) {
  currentStyle = style;
  lastStyleId = style.id;
  const groupColors = ['#ce917c','#c4bc91','#78c2be','#a8a1c9','#c4a483','#9ba6ac','#bd93c9','#a5b589'];
  frozenPalette = Object.freeze(style.palette || { background: '#141714', accent: groupColors[+style.group - 1] });
  document.documentElement.style.setProperty('--detail-bg', frozenPalette.background);
  const next = handbook.styles[style.id % handbook.styles.length], examples = style.examples;
  $('#detail-page').innerHTML = `<div class="detail-background" id="detail-background" aria-hidden="true"></div><article class="detail-content">
    <header class="detail-intro">
      <a class="back-link" href="#/index" data-return>← <span>Back to index</span></a>
      <p class="detail-label">${pad(style.id)} / ${escape(style.groupName)}</p>
      <h1 class="detail-title" tabindex="-1">${escape(style.name)}</h1>
      <p class="detail-description">${escape(style.description)}</p>
      <div class="detail-meta"><span>${examples.length} / 8 references${examples.length < 8 ? ' · Examples pending' : ''}</span><a href="./artstyles-300.md" target="_blank" rel="noopener">Original notes ↗</a></div>
    </header>
    ${examples.length ? `<section class="gallery-track" id="gallery-track" aria-label="${escape(style.name)} references">
      <div class="gallery-viewport"><div class="gallery-label"><span>( reference studies )</span><span>Scroll to turn · Select to view</span></div>
        <div class="gallery-stage" id="gallery-stage">${examples.map((example,index) => `<figure class="reference" data-reference="${index}">
          <button class="reference-open" data-open-image="${index}" aria-label="View reference ${index + 1}: ${escape(example.title)}"><img src="${escape(safeURL(example.image))}" alt="${escape(example.title)}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer"></button>
          <figcaption><span>${String(index+1).padStart(2,'0')} / ${String(examples.length).padStart(2,'0')}</span><a href="${escape(safeURL(example.url))}" target="_blank" rel="noopener">${sourceLabel(example)} ↗<span class="sr-only">: ${escape(example.title)}</span></a></figcaption>
        </figure>`).join('')}</div>
        <div class="gallery-controls"><span class="gallery-current" id="gallery-current" aria-live="off">01 / ${String(examples.length).padStart(2,'0')}</span><span>Scroll to explore</span><div class="gallery-buttons"><button id="gallery-prev" aria-label="Previous reference">←</button><button id="gallery-next" aria-label="Next reference">→</button></div></div>
      </div></section>` : ''}
    ${examples.length < 8 ? `<aside class="pending"><span class="mono">Examples pending</span><p>${examples.length ? `${8 - examples.length} more references are still being collected.` : 'References for this style are still being collected.'}</p></aside>` : ''}
    <p class="reference-note">Collected from Pinterest. Pin = image page; board / idea = collection. <a href="./sources.html">About the references ↗</a></p>
    <a class="next-style" href="#/style/${next.id}"><span>Next style ↗</span><strong>${escape(next.name)}</strong></a>
  </article>`;
  $('#detail-page').querySelectorAll('.reference img').forEach(img => img.addEventListener('error', () => {
    const replacement = document.createElement('span');
    replacement.className = 'image-unavailable';
    replacement.textContent = 'Preview unavailable. Open the source below.';
    img.replaceWith(replacement);
  }, { once: true }));
  setupGallery();
  const version = routeVersion;
  import('./lib/background.jsx').then(({ mountBackground }) => {
    if (version !== routeVersion || currentStyle?.id !== style.id) return;
    background = mountBackground($('#detail-background'), frozenPalette, paused);
  }).catch(() => { /* The fixed palette remains usable without WebGL. */ });
  document.title = `${style.name} — hamanti`;
}
function setupGallery() {
  galleryCleanup?.();
  galleryCleanup = galleryUpdate = null;
  const track = $('#gallery-track');
  if (!track) return;
  const stage = $('#gallery-stage'), cards = [...track.querySelectorAll('.reference')];
  cards.forEach(card => { card.style.transform = ''; card.style.opacity = ''; card.classList.remove('is-active'); card.querySelectorAll('button,a').forEach(el => el.removeAttribute('tabindex')); });
  track.classList.remove('barrel'); track.style.height = ''; stage.style.transform = '';
  if (!desktop.matches || paused || cards.length < 3) { lenis?.resize(); return; }
  track.classList.add('barrel');
  const radius = Math.max(420, Math.min(innerWidth * .44, 620)), step = 360 / cards.length;
  track.style.height = `${cards.length * 65 + 100}svh`;
  stage.style.setProperty('--radius', `${radius}px`);
  let active = -1;
  cards.forEach((card,i) => {
    card.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
    card.querySelector('img')?.setAttribute('loading','eager');
  });
  const move = index => {
    index = Math.max(0, Math.min(cards.length - 1, index));
    smoothTo(track.getBoundingClientRect().top + scrollY + index / (cards.length - 1) * (track.offsetHeight - innerHeight));
  };
  const prev = () => move(active - 1), next = () => move(active + 1);
  const keyboard = event => {
    if (!track.contains(document.activeElement) || $('#lightbox').open) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(active + (event.key === 'ArrowRight' ? 1 : -1)); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); move(event.key === 'Home' ? 0 : cards.length - 1); }
  };
  $('#gallery-prev').addEventListener('click', prev);
  $('#gallery-next').addEventListener('click', next);
  track.addEventListener('keydown', keyboard);
  galleryUpdate = () => {
    const position = clamp(-track.getBoundingClientRect().top / (track.offsetHeight - innerHeight)) * (cards.length - 1);
    const index = Math.round(position);
    stage.style.transform = `translateZ(${-radius}px) rotateY(${-position * step}deg)`;
    cards.forEach((card,i) => {
      const distance = Math.abs(((i - position) * step + 540) % 360 - 180);
      card.style.opacity = distance > 100 ? 0 : .3 + .7 * (1 - distance / 100);
    });
    if (index === active) return;
    active = index;
    cards.forEach((card,i) => { card.classList.toggle('is-active', i === active); card.querySelectorAll('button,a').forEach(el => el.tabIndex = i === active ? 0 : -1); });
    $('#gallery-current').textContent = `${String(index+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
    $('#gallery-prev').disabled = index === 0; $('#gallery-next').disabled = index === cards.length - 1;
  };
  galleryCleanup = () => {
    $('#gallery-prev')?.removeEventListener('click', prev); $('#gallery-next')?.removeEventListener('click', next);
    track.removeEventListener('keydown', keyboard);
  };
  lenis?.resize(); requestUpdate();
}
function openImage(index) {
  const example = currentStyle.examples[index];
  if (!example) return;
  $('#lightbox-image').src = safeURL(example.image); $('#lightbox-image').alt = example.title;
  $('#lightbox-title').textContent = example.title;
  $('#lightbox-counter').textContent = `${pad(currentStyle.id)} · ${index + 1} / ${currentStyle.examples.length}`;
  $('#lightbox-source').href = safeURL(example.url);
  $('#lightbox-source').textContent = `Pinterest ${sourceLabel(example).toLowerCase()} ↗`;
  lenis?.stop(); $('#lightbox').showModal(); $('#lightbox-close').focus();
}
async function cover(type, render) {
  if (paused) { render(); return; }
  const overlay = $('#transition');
  overlay.className = `transition active ${type}`; lenis?.stop();
  try {
    if (type === 'curtains') {
      const curtains = [...overlay.querySelectorAll('.curtain')];
      curtains.forEach((element,i) => { element.style.transformOrigin = i % 2 ? 'bottom' : 'top'; });
      await animate(curtains, { scaleY: [0,1] }, { duration:.45, delay:stagger(.035), ease:[.76,0,.24,1] });
      render();
      curtains.forEach((element,i) => { element.style.transformOrigin = i % 2 ? 'top' : 'bottom'; });
      await animate(curtains, { scaleY: [1,0] }, { duration:.5, delay:stagger(.035), ease:[.76,0,.24,1] });
    } else {
      const line = overlay.querySelector('.transition-line');
      await animate(line, { clipPath:['inset(50% 49.95%)','inset(0% 49.95%)','inset(0% 0%)'] }, { duration:.65, times:[0,.45,1], ease:[.76,0,.24,1] });
      render();
      await animate(line, { clipPath:['inset(0% 0%)','inset(0% 0% 0% 100%)'] }, { duration:.45, ease:[.76,0,.24,1] });
    }
  } finally { overlay.className = 'transition'; lenis?.start(); }
}
function showRoute(hash, { returnToIndex = false, focus = true } = {}) {
  routeVersion++; background?.destroy(); background = null; galleryCleanup?.(); galleryCleanup = galleryUpdate = null;
  $('#lightbox').close();
  const match = hash.match(/^#\/style\/(\d+)$/), style = match && handbook.styles.find(item => item.id === Number(match[1]));
  const wasDetail = Boolean(currentStyle);
  if (style && !wasDetail) homeScroll = scrollY;
  document.body.classList.toggle('detail-mode', Boolean(style));
  $('#home-page').hidden = Boolean(style); $('#detail-page').hidden = !style;
  if (style) {
    renderDetail(style); lenis?.resize(); smoothTo(0, { immediate:true });
    if (focus) $('.detail-title').focus({preventScroll:true});
  } else {
    currentStyle = null; $('#detail-page').replaceChildren(); document.title = 'hamanti — 300 ways of seeing';
    lenis?.resize();
    const destination = hash.startsWith('#/index') ? returnToIndex && homeScroll ? homeScroll : $('#index') : 0;
    smoothTo(destination, { immediate:true });
    if (focus) {
      if (returnToIndex && lastStyleId) $(`[data-style="${lastStyleId}"]`)?.focus({preventScroll:true});
      else $('#main').focus({preventScroll:true});
    }
    if (!hash.startsWith('#/index')) typeTitle();
  }
  lenis?.resize(); bindControls(); requestUpdate();
}
document.addEventListener('click', async event => {
  const image = event.target.closest('[data-open-image]');
  if (image) { openImage(Number(image.dataset.openImage)); return; }
  const link = event.target.closest('a[href^="#/"]');
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || !handbook) return;
  event.preventDefault(); if (navigationBusy) return;
  const hash = link.getAttribute('href');
  if (!currentStyle && hash === '#/index') { history.pushState(null,'',hash); smoothTo($('#index')); return; }
  navigationBusy = true;
  try {
    await cover(link.hasAttribute('data-home') ? 'curtains' : 'line', () => {
      history.pushState(null,'',hash); showRoute(hash, {returnToIndex:link.hasAttribute('data-return')});
    });
  } finally { navigationBusy = false; }
});
addEventListener('popstate', () => { if (handbook) showRoute(location.hash, {returnToIndex:true}); });
addEventListener('scroll', requestUpdate, {passive:true});
addEventListener('resize', () => { if (currentStyle) setupGallery(); requestUpdate(); }, {passive:true});
$('#lightbox-close').addEventListener('click', () => $('#lightbox').close());
$('#lightbox').addEventListener('close', () => lenis?.start());
$('#lightbox').addEventListener('click', event => { if (event.target === $('#lightbox')) $('#lightbox').close(); });
$('#motion-toggle').addEventListener('click', () => {
  savedPause = !paused; paused = savedPause;
  try { localStorage.setItem('hamanti-motion', paused ? 'paused' : 'running'); } catch {}
  setupMotion();
  if (paused) { clearTimeout(titleTimer); $('#type-title').textContent = 'hamanti'; }
});
reduced.addEventListener('change', () => { paused = reduced.matches || savedPause; setupMotion(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !currentStyle && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); smoothTo($('#index')); }
});
for (const [id, key] of [['search','query'],['group-filter','group'],['coverage-filter','coverage']]) {
  $(`#${id}`).addEventListener(id === 'search' ? 'input' : 'change', event => {
    filters[key] = event.target.value; renderIndex();
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.group !== 'all') params.set('group', filters.group);
    if (filters.coverage !== 'all') params.set('coverage', filters.coverage);
    history.replaceState(null,'',`${location.pathname}${params.size ? '?' + params : ''}#/index`);
  });
}
$('#clear-filters').addEventListener('click', () => {
  filters.query = ''; filters.group = filters.coverage = 'all';
  $('#search').value = ''; $('#group-filter').value = $('#coverage-filter').value = 'all';
  history.replaceState(null,'',`${location.pathname}#/index`); renderIndex(); $('#search').focus();
});
try {
  handbook = await loadHandbook(); $('#loading').hidden = true;
  $('#group-filter').insertAdjacentHTML('beforeend', handbook.groups.map(group => `<option value="${group.id}">${escape(group.name)}</option>`).join(''));
  const params = new URLSearchParams(location.search);
  filters.query = params.get('q') || '';
  if (handbook.groups.some(g => g.id === params.get('group'))) filters.group = params.get('group');
  if (['complete','pending'].includes(params.get('coverage'))) filters.coverage = params.get('coverage');
  $('#search').value = filters.query; $('#group-filter').value = filters.group; $('#coverage-filter').value = filters.coverage;
  $('#footer-coverage').textContent = `${handbook.stats.examples.toLocaleString()} references`;
  $('#hero-plant').innerHTML = fern(); introWords(); renderIndex(); setupMotion(); showRoute(location.hash, {focus:false});
} catch (error) {
  $('#loading').hidden = true; $('#error').hidden = false;
  $('#error').innerHTML = `<p>The handbook could not open.</p><p>${escape(error.message)}</p><a href="./artstyles-300.md">Read the original notes ↗</a>`;
}
