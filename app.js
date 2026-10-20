import './styles.css';
import './lib/horizontal.css';
import { animate, hover, press, stagger } from 'motion';
import Lenis from 'lenis';
import { loadHandbook } from './lib/handbook.js';
import { searchStyles } from './lib/search.js';

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
let handbook, currentStyle, background, lenis, galleryCleanup, galleryUpdate, landscape, homeScroll = 0, lastStyleId;
let routeVersion = 0, navigationBusy = false, controlsCleanup = [], titleTimer, frameRequest;
const filters = { query: '', letter: 'all' };
let frozenPalette;
let introWordElements = [];
let indexCards = [], curvedCards = new Set(), cardLayout;

function measureCards() {
  const grid = $('.style-grid');
  if (!grid || currentStyle || !indexCards.length) return;
  const columns = getComputedStyle(grid);
  cardLayout = {
    start:grid.getBoundingClientRect().left + $('#home-page').scrollLeft,
    width:parseFloat(columns.gridAutoColumns),
    gap:parseFloat(columns.columnGap),
  };
}
function curveCards(scrollLeft) {
  if (!cardLayout) return;
  const {start,width,gap} = cardLayout, pitch = width + gap;
  const first = Math.max(0,Math.floor((scrollLeft-start)/pitch)-1);
  const last = Math.min(indexCards.length-1,Math.ceil((scrollLeft+innerWidth-start)/pitch)+1);
  const visible = new Set();
  for (let i=first;i<=last;i++) {
    const card = indexCards[i];
    const distance = Math.max(-3.7,Math.min(3.7,(start+i*pitch+width/2-scrollLeft-innerWidth/2)/pitch));
    const tilt = -distance * 10;
    const depth = Math.min(145,distance*distance*13);
    card.style.transform = paused ? 'none' : `perspective(1000px) translateZ(${depth.toFixed(1)}px) rotateY(${tilt.toFixed(2)}deg)`;
    card.style.willChange = paused ? 'auto' : 'transform';
    visible.add(card);
  }
  for (const card of curvedCards) if (!visible.has(card)) {
    card.style.transform = ''; card.style.willChange = '';
  }
  curvedCards = visible;
}

function smoothTo(target, options = {}) {
  const home = $('#home-page');
  const value = typeof target === 'number' ? target : currentStyle
    ? target.getBoundingClientRect().top + scrollY
    : target.getBoundingClientRect().left - home.getBoundingClientRect().left + home.scrollLeft;
  if (lenis && !paused) lenis.scrollTo(value, { duration: 1.1, force: options.immediate === true, ...options });
  else if (currentStyle) window.scrollTo({ top:value, behavior:'instant' });
  else home.scrollTo({left:value,behavior:'instant'});
}
function setupMotion() {
  lenis?.destroy();
  lenis = !paused ? new Lenis({
    autoRaf:true, lerp:.085, smoothWheel:true, syncTouch:false, anchors:false,
    ...(!currentStyle ? {wrapper:$('#home-page'),content:$('#home-track'),orientation:'horizontal',gestureOrientation:'both'} : {}),
  }) : null;
  document.body.classList.toggle('motion-paused', paused);
  $('#motion-toggle').textContent = paused ? 'Motion paused' : 'Pause motion';
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  background?.pause(paused);
  landscape?.pause(paused);
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
  element.innerHTML = text.trim().split(/\s+/).map(word => `<span class="intro-word" aria-hidden="true">${escape(word)}</span>`).join(' ');
  introWordElements = [...element.querySelectorAll('.intro-word')];
}
function requestUpdate() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = null;
    if (!currentStyle) {
      const intro = $('#about').getBoundingClientRect();
      // Finish all word geometry reads before writing styles.
      const bounds = intro.right > 0 && intro.left < innerWidth
        ? introWordElements.map(word => word.getBoundingClientRect()) : null;
      introWordElements.forEach((word, i) => {
        // Reveal each word only after it passes the horizontal centre.
        const progress = paused ? 1 : bounds
          ? clamp((innerWidth * .5 - (bounds[i].left + bounds[i].width / 2)) / 90)
          : intro.right <= 0 ? 1 : 0;
        const value = String(Math.round(progress * 100) / 100);
        if (word.style.opacity !== value) word.style.opacity = value;
      });
      const home = $('#home-page'), index = $('#index').getBoundingClientRect();
      const indexStart = index.left + home.scrollLeft;
      $('#index-prev').disabled = home.scrollLeft <= indexStart + 2;
      $('#index-next').disabled = index.right <= innerWidth + 2;
      curveCards(home.scrollLeft);
    } else galleryUpdate?.();
    const footer = $('#footer').getBoundingClientRect();
    const footerProgress = currentStyle
      ? clamp((innerHeight - footer.top) / Math.min(innerHeight, footer.height))
      : clamp((innerWidth - footer.left) / Math.min(innerWidth,footer.width));
    $('.footer-inner').style.opacity = paused ? 1 : .4 + .6 * footerProgress;
    $('.footer-inner').style.transform = paused ? 'none' : `translateY(${(1 - footerProgress) * -90}px)`;
  });
}
function renderIndex() {
  const query = filters.query.trim();
  const styles = searchStyles(handbook.styles, query).filter(style =>
    filters.letter === 'all' || style.name.charAt(0).toLocaleUpperCase() === filters.letter
  );
  $('#style-index').innerHTML = `<div class="style-grid">${styles.map(style => `<a href="#/style/${style.id}" class="style-card${style.examples.length ? '' : ' style-card-empty'}" data-style="${style.id}" title="${escape(style.name)}" aria-label="${escape(style.name)}${style.found < style.expected ? ', examples pending' : ''}">
    ${style.examples[0] ? `<div class="style-picture"><img src="${escape(safeURL(style.examples[0].thumbnail || style.examples[0].image))}" alt="${escape(style.examples[0].title)}" loading="lazy" decoding="async" width="${style.examples[0].width}" height="${style.examples[0].height}"></div>` : `<div class="style-picture style-picture-pending" aria-hidden="true"><span>${escape(style.name.charAt(0))}</span></div>`}
    <div class="card-label"><span class="style-number">${pad(style.rank)}</span><span class="style-coverage">${style.found ? `${style.found} ${style.found === 1 ? 'reference' : 'references'}` : 'Images to come'}</span></div>
    <h3 class="style-name">${escape(style.name)}</h3><span class="card-open" aria-hidden="true">↗</span>
  </a>`).join('')}</div>`;
  $('#result-count').textContent = `${styles.length} ${styles.length === 1 ? 'style' : 'styles'}${query || filters.letter !== 'all' ? ' / 300' : ' · A — Z'}`;
  $('#search-clear').hidden = !query;
  $('#empty').hidden = styles.length > 0;
  indexCards = [...document.querySelectorAll('.style-card')];
  curvedCards.clear(); measureCards();
  lenis?.resize();
  requestUpdate();
}
function sourceLabel(example) { return ({pin:'Pin',board_or_idea:'Board / idea',website:'Website',museum:'Collection',upload:'Selected reference'})[example.kind] || 'Source'; }
function renderDetail(style) {
  currentStyle = style;
  lastStyleId = style.id;
  const groupColors = ['#ce917c','#c4bc91','#78c2be','#a8a1c9','#c4a483','#9ba6ac','#bd93c9','#a5b589'];
  frozenPalette = Object.freeze(style.palette || { background: '#141714', accent: groupColors[(+style.group - 1) % groupColors.length] });
  document.documentElement.style.setProperty('--detail-bg', frozenPalette.background);
  const next = handbook.styles[style.rank % handbook.styles.length], examples = style.examples;
  $('#detail-page').innerHTML = `<div class="detail-background" id="detail-background" aria-hidden="true"></div><article class="detail-content">
    <header class="detail-intro">
      <a class="back-link" href="#/index" data-return>← <span>Back to index</span></a>
      <p class="detail-label">${pad(style.rank)} / 300</p>
      <h1 class="detail-title" tabindex="-1">${escape(style.name)}</h1>
      <p class="detail-description">${escape(style.description)}</p>
      <div class="detail-meta"><span>${examples.length} Full HD ${examples.length === 1 ? 'reference' : 'references'}${examples.length < style.expected ? ' · Examples pending' : ''}</span>${style.sources?.[0] ? `<a href="${escape(safeURL(style.sources[0].url))}" target="_blank" rel="noopener">Read about this direction ↗</a>` : `<a href="./artstyles-300.md" target="_blank" rel="noopener">Original notes ↗</a>`}</div>
    </header>
    ${examples.length ? `<section class="gallery-track" id="gallery-track" aria-label="${escape(style.name)} references">
      <div class="gallery-viewport"><div class="gallery-label"><span>( reference studies )</span><span id="gallery-hint">Select to view</span></div>
        <div class="gallery-stage" id="gallery-stage">${examples.map((example,index) => `<figure class="reference${example.height > example.width * 1.45 ? ' reference-tall' : ''}" data-reference="${index}">
          <button class="reference-open" data-open-image="${index}" aria-label="View reference ${index + 1}: ${escape(example.title)}"><img src="${escape(safeURL(example.image))}" alt="${escape(example.title)}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer"></button>
          <figcaption><span>${String(index+1).padStart(2,'0')} / ${String(examples.length).padStart(2,'0')}</span>${example.url ? `<a href="${escape(safeURL(example.url))}" target="_blank" rel="noopener">${sourceLabel(example)} ↗<span class="sr-only">: ${escape(example.title)}</span></a>` : '<span>Selected reference</span>'}</figcaption>
        </figure>`).join('')}</div>
        <div class="gallery-controls"><span class="gallery-current" id="gallery-current" aria-live="off">01 / ${String(examples.length).padStart(2,'0')}</span><div class="gallery-buttons"><button id="gallery-prev" aria-label="Previous reference">←</button><button id="gallery-next" aria-label="Next reference">→</button></div></div>
      </div></section>` : ''}
    ${examples.length < style.expected ? `<aside class="pending"><span class="mono">Examples pending</span><p>${style.expected - examples.length} more ${style.expected - examples.length === 1 ? 'reference' : 'references'} to come.</p></aside>` : ''}
    ${examples.length ? '<p class="reference-note"><a href="./sources.html">Sources & credits ↗</a></p>' : ''}
    <a class="next-style" href="#/style/${next.id}"><span>Next style ↗</span><strong>${escape(next.name)}</strong></a>
  </article>`;
  $('#detail-page').querySelectorAll('.reference img').forEach(img => img.addEventListener('error', () => {
    const replacement = document.createElement('span');
    replacement.className = 'image-unavailable';
    replacement.textContent = 'Image unavailable. Please try again later.';
    img.replaceWith(replacement);
  }, { once: true }));
  setupGallery();
  const version = routeVersion;
  import('./lib/background.jsx').then(({ mountBackground }) => {
    if (version !== routeVersion || currentStyle?.id !== style.id) return;
    return mountBackground($('#detail-background'), frozenPalette, paused).then(instance => {
      if (version !== routeVersion) instance.destroy();
      else background = instance;
    });
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
  $('#gallery-hint').textContent = 'Select to view';
  if (!desktop.matches || paused || cards.length < 3) { lenis?.resize(); return; }
  track.classList.add('barrel');
  $('#gallery-hint').textContent = 'Scroll to turn · Select to view';
  const radius = Math.max(900, Math.min(innerWidth * .8, 1550)), step = 360 / cards.length;
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
  $('#lightbox-counter').textContent = `${pad(currentStyle.rank)} · ${index + 1} / ${currentStyle.examples.length}`;
  $('#lightbox-source').href = safeURL(example.url);
  $('#lightbox-source').textContent = `${sourceLabel(example)} ↗`;
  $('#lightbox-source').hidden = !example.url;
  lenis?.stop(); $('#lightbox').showModal(); $('.lightbox-image').scrollTop = 0; $('#lightbox-close').focus();
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
  if (style && !wasDetail) homeScroll = $('#home-page').scrollLeft;
  document.body.classList.toggle('detail-mode', Boolean(style));
  $('#home-page').hidden = Boolean(style); $('#detail-page').hidden = !style;
  if (style) {
    currentStyle = style; $('#main').after($('#footer'));
    setupMotion(); renderDetail(style); lenis?.resize(); smoothTo(0, { immediate:true });
    if (focus) $('.detail-title').focus({preventScroll:true});
  } else {
    currentStyle = null; $('#detail-page').replaceChildren(); document.title = 'hamanti — 300 ways of seeing';
    $('#home-track').append($('#footer')); window.scrollTo({top:0,behavior:'instant'});
    setupMotion();
    const destination = hash.startsWith('#/index') ? returnToIndex && homeScroll ? homeScroll : $('#index') : hash === '#/about' ? $('#about') : 0;
    smoothTo(destination, { immediate:true });
    if (focus) {
      if (returnToIndex && lastStyleId) $(`[data-style="${lastStyleId}"]`)?.focus({preventScroll:true});
      else $('#main').focus({preventScroll:true});
    }
    if (!hash.startsWith('#/index')) typeTitle();
  }
  lenis?.resize(); bindControls(); requestUpdate();
  measureCards();
  landscape?.update();
}
document.addEventListener('click', async event => {
  const image = event.target.closest('[data-open-image]');
  if (image) { openImage(Number(image.dataset.openImage)); return; }
  const link = event.target.closest('a[href^="#/"]');
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || !handbook) return;
  event.preventDefault(); if (navigationBusy) return;
  const hash = link.getAttribute('href');
  if (!currentStyle && ['#/index','#/about'].includes(hash)) {
    history.pushState(null,'',hash); smoothTo($(hash === '#/about' ? '#about' : '#index')); return;
  }
  navigationBusy = true;
  try {
    await cover(link.hasAttribute('data-home') ? 'curtains' : 'line', () => {
      history.pushState(null,'',hash); showRoute(hash, {returnToIndex:link.hasAttribute('data-return')});
    });
  } finally { navigationBusy = false; }
});
addEventListener('popstate', () => { if (handbook) showRoute(location.hash, {returnToIndex:true}); });
addEventListener('scroll', requestUpdate, {passive:true});
$('#home-page').addEventListener('scroll',requestUpdate,{passive:true});
// Native horizontal touch/trackpad scrolling stays available with motion off.
$('#home-page').addEventListener('wheel',event => {
  if (!paused || currentStyle || event.ctrlKey || event.target.closest('select')) return;
  const delta = Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  event.preventDefault();
  $('#home-page').scrollLeft += delta * (event.deltaMode===1 ? 16 : event.deltaMode===2 ? innerWidth : 1);
},{passive:false});
addEventListener('resize', () => { if (currentStyle) setupGallery(); else measureCards(); requestUpdate(); }, {passive:true});
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
  if (currentStyle || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const card = document.activeElement.closest('.style-card');
  if (card && ['ArrowLeft','ArrowRight'].includes(event.key)) {
    const cards = [...document.querySelectorAll('.style-card')], index = cards.indexOf(card);
    const nextIndex = Math.max(0,Math.min(cards.length-1,index+(event.key==='ArrowRight'?1:-1)));
    const next = cards[nextIndex];
    event.preventDefault(); next?.focus({preventScroll:true});
    if (cardLayout) {
      const destination = cardLayout.start + nextIndex*(cardLayout.width+cardLayout.gap) + cardLayout.width/2 - innerWidth/2;
      smoothTo(Math.max($('#index').offsetLeft,Math.min(destination,$('#index').offsetLeft+$('#index').offsetWidth-innerWidth)));
    }
    return;
  }
  const direction = ({ArrowRight:1,PageDown:1,ArrowLeft:-1,PageUp:-1})[event.key];
  if (direction) { event.preventDefault(); smoothTo($('#home-page').scrollLeft + direction * innerWidth * .8); }
  if (event.key==='Home' || event.key==='End') {
    event.preventDefault(); smoothTo(event.key==='Home'?0:$('#home-page').scrollWidth);
  }
});
$('#index-prev').addEventListener('click',()=>smoothTo(Math.max($('#index').offsetLeft,$('#home-page').scrollLeft-innerWidth*.8)));
$('#index-next').addEventListener('click',()=>smoothTo($('#home-page').scrollLeft+innerWidth*.8));
$('#search').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); $('#search-clear').click(); }
  if (event.key === 'ArrowDown') { event.preventDefault(); $('.style-card')?.focus(); }
});
$('#search-clear').addEventListener('click', () => {
  $('#search').value = ''; $('#search').dispatchEvent(new Event('input')); $('#search').focus();
});
for (const [id, key] of [['search','query'],['letter-filter','letter']]) {
  $(`#${id}`).addEventListener(id === 'search' ? 'input' : 'change', event => {
    filters[key] = event.target.value; renderIndex();
    smoothTo($('#index'),{immediate:true});
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.letter !== 'all') params.set('letter', filters.letter);
    history.replaceState(null,'',`${location.pathname}${params.size ? '?' + params : ''}#/index`);
  });
}
$('#clear-filters').addEventListener('click', () => {
  filters.query = ''; filters.letter = 'all';
  $('#search').value = ''; $('#letter-filter').value = 'all';
  history.replaceState(null,'',`${location.pathname}#/index`); renderIndex(); smoothTo($('#index'),{immediate:true}); $('#search').focus();
});
try {
  handbook = await loadHandbook(); $('#loading').hidden = true;
  handbook.styles.sort((a,b) => a.name.localeCompare(b.name, 'en', {sensitivity:'base',numeric:true}));
  handbook.styles.forEach((style,index) => { style.rank = index + 1; });
  const letters = [...new Set(handbook.styles.map(style => style.name.charAt(0).toLocaleUpperCase()))];
  $('#letter-filter').insertAdjacentHTML('beforeend', letters.map(letter => `<option value="${escape(letter)}">${escape(letter)}</option>`).join(''));
  const params = new URLSearchParams(location.search);
  filters.query = params.get('q') || '';
  if (letters.includes(params.get('letter'))) filters.letter = params.get('letter');
  $('#search').value = filters.query; $('#letter-filter').value = filters.letter;
  $('#footer-coverage').textContent = `${handbook.stats.examples.toLocaleString()} references`;
  $('.index-total').innerHTML = `${handbook.styles.length} directions<br>A — Z`;
  introWords(); renderIndex(); showRoute(location.hash, {focus:false});
  document.fonts.ready.then(() => { lenis?.resize(); measureCards(); requestUpdate(); });
  import('./lib/shanshui.js').then(({createShanShui}) => {
    landscape = createShanShui($('#landscape'),$('#home-page'));
  }).catch(() => { $('#landscape').classList.add('landscape-unavailable'); });
} catch (error) {
  $('#loading').hidden = true; $('#error').hidden = false;
  $('#error').innerHTML = `<p>The handbook could not open.</p><p>${escape(error.message)}</p><a href="./artstyles-300.md">Read the original notes ↗</a>`;
}
