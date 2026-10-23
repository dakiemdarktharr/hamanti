import './styles.css';
import './lib/horizontal.css';
import './lib/polish.css';
import './lib/card-fan.css';
import './lib/hand-preview.css';
import { animate, hover, press } from 'motion';
import Lenis from 'lenis';
import { loadHandbook } from './lib/handbook.js';
import { searchStyles } from './lib/search.js';
import { createLoadingScreen } from './lib/loading.js';
import { openingAssets, warmImages } from './lib/preload.js';
import { mixedCurtains, prepareHomeReturn } from './lib/page-transition.js';
import { readIndexFilters, resolveRoute, shouldPauseMotion } from './lib/navigation.js';
import { createImageViewer } from './lib/lightbox.js';
import { fanFrame, fanPose, fanDeckPose, fanScrollLength, stepFanSpring } from './lib/card-fan.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = value => { try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const pad = value => String(value).padStart(3, '0');
const clamp = value => Math.max(0, Math.min(1, value));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 900px)');
let savedPause = false;
try { savedPause = localStorage.getItem('hamanti-motion') === 'paused'; } catch {}
let paused = shouldPauseMotion(reduced.matches, savedPause);
const opening = createLoadingScreen(() => paused);
let returningFromCredits = false;
try { returningFromCredits=sessionStorage.getItem('hamanti-home-return')==='1'; sessionStorage.removeItem('hamanti-home-return'); } catch {}
if (returningFromCredits && !reduced.matches) {
  prepareHomeReturn($('#transition'));
}
let detailReady = Promise.resolve();
let handbook, currentStyle, background, lenis, galleryCleanup, galleryUpdate, landscape, homeScroll = 0, lastStyleId;
let routeVersion = 0, navigationBusy = false, controlsCleanup = [], titleTimer, frameRequest, scrollSaveTimer, galleryMove, pendingFocus;
const filters = { query: '', letter: 'all' };
let frozenPalette;
let introWordElements = [];
let indexCards = [], curvedCards = new Set(), cardLayout;
let homeAnchor;
let fanSpring;
// Hands are part of the normal index. The query flag adds review controls only.
const handReviewEnabled=new URLSearchParams(location.search).get('preview')==='hands';
if(handReviewEnabled)document.body.classList.add('hand-preview');
let handPreviewAPI,handPreviewLoading;
function prepareHandPreview(){
  return handPreviewLoading ||= import('./lib/hand-preview.js').then(({createHandPreview})=>createHandPreview({
    journey:$('.journey'),getLayout:()=>cardLayout,review:handReviewEnabled,
    setScroll:value=>smoothTo(value,{immediate:true}),requestUpdate,
  })).then(api=>{handPreviewAPI=api;requestUpdate();return true;}).catch(error=>{
    console.error('Hand preview:',error);
    document.body.dataset.handPreviewError=error.message;
    const status=$('.hand-review-status');if(status)status.textContent='Hands could not load. Reload to retry.';
    return false;
  });
}
const viewer = createImageViewer({
  dialog:$('#lightbox'), getStyle:() => currentStyle,
  onOpen:() => lenis?.stop(),
  onClose:index => { galleryMove?.(index, {immediate:true}); lenis?.start(); return $(`[data-open-image="${index}"]`); },
});

function savePagePosition() {
  if (!handbook || navigationBusy || opening.active) return;
  const position=currentStyle ? {detailScroll:scrollY} : {homeScroll:$('#home-page').scrollLeft};
  history.replaceState({...history.state,...position},'');
}
function syncFilters() {
  const letters = [...$('#letter-filter').options].map(option => option.value);
  const next = readIndexFilters(location.search, letters);
  if (filters.query === next.query && filters.letter === next.letter) return;
  Object.assign(filters, next);
  $('#search').value = filters.query; $('#letter-filter').value = filters.letter;
  renderIndex();
}

function measureCards() {
  const grid = $('.style-grid');
  if (!grid || currentStyle || !indexCards.length) {cardLayout=undefined;return;}
  const columns = getComputedStyle(grid);
  const card = getComputedStyle(indexCards[0]);
  cardLayout = {
    start:grid.getBoundingClientRect().left + $('#home-page').scrollLeft,
    sectionStart:$('#index').offsetLeft,
    pitch:parseFloat(columns.gridAutoColumns),
    cardWidth:parseFloat(card.width), cardHeight:parseFloat(card.height),
    slots:parseFloat(getComputedStyle($('#index')).getPropertyValue('--fan-slots')),
    gutter:parseFloat(getComputedStyle($('#index')).paddingLeft),
    count:indexCards.length,
    journeyHeight:$('.journey').getBoundingClientRect().height,
  };
}
function curveCards(scrollLeft,time) {
  if (!cardLayout) return;
  // Preserve the complete painted grip, including its spring displacement,
  // until the closing cover is opaque. Stopping scroll must not reset a pose.
  if(navigationBusy&&$('#transition').dataset.phase==='closing')return;
  const {start,pitch,cardWidth,slots} = cardLayout;
  // The card controller owns the reversible opening and both end decks.
  // The hands observe these final poses, including the scroll spring.
  const frame = fanFrame(cardLayout,scrollLeft,innerWidth);
  fanSpring=stepFanSpring(fanSpring,scrollLeft,time,!paused&&!navigationBusy&&!opening.active&&frame.origin===0);
  const poseAt=index=>{
    const pose=fanPose(index,cardLayout,frame,innerWidth);
    const distance=index-frame.centre;
    const weight=clamp((Math.max(1,(slots-1)/2)+1.45-Math.abs(distance))/1.1);
    const give=fanSpring.value*weight*frame.spread;
    pose.rotation+=give*1.7;
    pose.y+=give*Math.sin(distance*.8)*4;
    return pose;
  };
  const decks=$('.fan-decks');
  decks.hidden=indexCards.length<2;
  decks.style.transform=`translateX(${(scrollLeft-start).toFixed(2)}px)`;
  for(const [selector,side] of [['.fan-deck-upper',1],['.fan-deck-lower',-1]]){
    const deck=decks.querySelector(selector),pose=fanDeckPose(side,cardLayout,frame,innerWidth);
    const pile=side<0?frame.deposited:Math.min(4,Math.max(0,indexCards.length-Math.ceil(frame.centre+(slots-1)/2)-1));
    deck.hidden=pile===0;deck.dataset.cards=String(pile);
    [...deck.querySelectorAll('i')].forEach((sheet,i)=>{sheet.hidden=i>=pile-1;});
    deck.style.opacity=String(side<0?1:frame.spread);
    const width=cardWidth*pose.scale,height=cardLayout.cardHeight*pose.scale;
    deck.style.width=`${width}px`; deck.style.height=`${height}px`;
    deck.style.transform=`translate(${(pose.x-width/2).toFixed(2)}px,${(cardLayout.journeyHeight*.47+pose.y-height/2).toFixed(2)}px)`;
  }
  const reach = Math.max(1,(slots-1)/2) + 2;
  const first = Math.max(0,Math.floor(frame.centre-reach));
  const last = Math.min(indexCards.length-1,Math.ceil(frame.centre+reach));
  const visible = new Set();
  for (let i=first;i<=last;i++) {
    const card = indexCards[i];
    const pose = poseAt(i);
    const shift = pose.x-(start+i*pitch+cardWidth/2-scrollLeft);
    card.style.transform = `translate(${shift.toFixed(2)}px,${pose.y.toFixed(2)}px) rotate(${pose.rotation.toFixed(3)}deg) scale(${pose.scale.toFixed(4)})`;
    card.style.opacity = String(pose.opacity);
    card.style.setProperty('--card-flip',`${pose.flip.toFixed(3)}deg`);
    card.style.zIndex = String(pose.order);
    card.style.setProperty('--fan-order',String(pose.order));
    card.style.pointerEvents = pose.opacity < .1 ? 'none' : '';
    card.style.willChange = paused ? 'auto' : 'transform';
    card.dataset.fanActive='';
    visible.add(card);
  }
  for (const card of curvedCards) if (!visible.has(card)) {
    card.style.transform = ''; card.style.willChange = ''; card.style.opacity = '';
    card.style.zIndex = ''; card.style.pointerEvents = '';card.style.removeProperty('--card-flip');
    delete card.dataset.fanActive;
    card.style.removeProperty('--fan-order');
  }
  curvedCards = visible;
  handPreviewAPI?.update(cardLayout,scrollLeft,frame,poseAt);
  if(fanSpring.awake){landscape?.hold(100);requestUpdate();}
}

function smoothTo(target, options = {}) {
  syncNativeScroll();
  if (!currentStyle && !options.immediate) landscape?.hold();
  const home = $('#home-page');
  const value = typeof target === 'number' ? target : currentStyle
    ? target.getBoundingClientRect().top + scrollY
    : target.getBoundingClientRect().left - home.getBoundingClientRect().left + home.scrollLeft;
  if (lenis && !paused) lenis.scrollTo(value, { duration: 1.1, force: options.immediate === true, ...options });
  else if (currentStyle) window.scrollTo({ top:value, behavior:'instant' });
  else home.scrollTo({left:value,behavior:'instant'});
}
function syncNativeScroll() {
  // Scroll restoration and inert opening content can update the native surface
  // before Lenis sees its event. Start the next gesture from the visible page.
  if(lenis && lenis.isScrolling!=='smooth' && Math.abs(lenis.animatedScroll-lenis.actualScroll)>1)lenis.resize();
}
function setupMotion() {
  lenis?.destroy();
  lenis = !paused ? new Lenis({
    autoRaf:true, lerp:.085, smoothWheel:true, syncTouch:false, anchors:false,
    ...(!currentStyle ? {wrapper:$('#home-page'),content:$('#home-track'),orientation:'horizontal',gestureOrientation:'both'} : {}),
  }) : null;
  document.body.classList.toggle('motion-paused', paused);
  $('#motion-toggle').textContent = reduced.matches ? 'Reduced motion on' : paused ? 'Motion paused' : 'Pause motion';
  $('#motion-toggle').disabled = reduced.matches;
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  background?.pause(paused);
  landscape?.pause(paused);
  if (currentStyle) setupGallery();
  if ($('#lightbox').open) lenis?.stop();
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
  $('.hero').classList.remove('is-typing');
  // The loading screen has already built the finished nameplate. Preserve it
  // after reveal instead of deleting it for the previous typewriter effect.
  $('#type-title').textContent = 'hamanti';
}
function introWords() {
  const element = $('#intro-copy'), text = element.textContent;
  element.setAttribute('aria-label', text);
  element.innerHTML = text.trim().split(/\s+/).map(word => `<span class="intro-word" aria-hidden="true">${escape(word)}</span>`).join(' ');
  introWordElements = [...element.querySelectorAll('.intro-word')];
}
function requestUpdate() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(time => {
    frameRequest = null;
    if (!handbook || !$('#error').hidden) return;
    const footer = $('#footer').getBoundingClientRect();
    if (!currentStyle) {
      const intro = $('#about').getBoundingClientRect();
      // Finish all word geometry reads before writing styles.
      const bounds = intro.right > 0 && intro.left < innerWidth
        ? introWordElements.map(word => word.getBoundingClientRect()) : null;
      const home = $('#home-page'), index = $('#index').getBoundingClientRect();
      const sections=[...$('#home-track').children];
      const section=sections.findLast(element=>element.offsetLeft<=home.scrollLeft+2) || sections[0];
      const unit=section.id==='index' && cardLayout ? cardLayout.pitch : section.offsetWidth;
      homeAnchor={id:section.id || 'hero',position:(home.scrollLeft-section.offsetLeft)/unit};
      introWordElements.forEach((word, i) => {
        // Reveal each word only after it passes the horizontal centre.
        const progress = paused ? 1 : bounds
          ? clamp((innerWidth * .5 - (bounds[i].left + bounds[i].width / 2)) / 90)
          : intro.right <= 0 ? 1 : 0;
        const value = String(Math.round(progress * 100) / 100);
        if (word.style.opacity !== value) word.style.opacity = value;
      });
      const indexStart = index.left + home.scrollLeft;
      $('#index-prev').disabled = home.scrollLeft <= indexStart + 2;
      $('#index-next').disabled = index.right <= innerWidth + 2;
      curveCards(home.scrollLeft,time);
      if (cardLayout && indexCards.length) {
        const frame=fanFrame(cardLayout,home.scrollLeft,innerWidth);
        const first=Math.max(0,Math.floor(frame.centre-(cardLayout.slots-1)/2));
        const last=Math.min(indexCards.length,first+Math.ceil(cardLayout.slots));
        $('#index-position').textContent = `${pad(first+1)} — ${pad(last)} / ${indexCards.length}`;
      } else $('#index-position').textContent = '';
    } else galleryUpdate?.();
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
  $('#index').style.setProperty('--fan-count',String(styles.length));
  $('#style-index').innerHTML = `<div class="style-grid">${styles.map(style => `<a href="#/style/${style.id}" class="style-card${style.examples.length ? '' : ' style-card-empty'}" data-style="${style.id}" title="${escape(style.name)}" aria-label="${escape(style.name)}${style.found < style.expected ? ', examples pending' : ''}"><div class="card-flipper"><div class="card-front">
    ${style.examples[0] ? `<div class="style-picture"><img src="${escape(safeURL(style.examples[0].thumbnail || style.examples[0].image))}" alt="${escape(style.examples[0].title)}" loading="lazy" decoding="async" width="${style.examples[0].width}" height="${style.examples[0].height}"></div>` : `<div class="style-picture style-picture-pending" aria-hidden="true"><span>${escape(style.name.charAt(0))}</span></div>`}
    <div class="card-label"><span class="style-number">${pad(style.rank)}</span><span class="style-coverage">${style.found ? `${style.found} ref${style.found === 1 ? '' : 's'}${style.found < style.expected ? ' · pending' : ''}` : 'Images pending'}</span></div>
    <h3 class="style-name">${escape(style.name)}</h3><span class="card-open" aria-hidden="true">↗</span>
  </div><div class="card-back" aria-hidden="true"></div></div></a>`).join('')}</div>`;
  $('#result-count').textContent = `${styles.length} ${styles.length === 1 ? 'style' : 'styles'}${query || filters.letter !== 'all' ? ' / 300' : ' · A — Z'}`;
  $('#search-clear').hidden = !query;
  $('#empty').hidden = styles.length > 0;
  $('.journey').hidden = !styles.length;
  $('.hand-review')?.toggleAttribute('hidden',!styles.length);
  $('#style-index').querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    const picture=img.parentElement; img.hidden=true;
    picture.classList.add('preview-unavailable'); picture.insertAdjacentHTML('beforeend','<span>Preview unavailable</span>');
  },{once:true}));
  indexCards = [...document.querySelectorAll('.style-card')];
  curvedCards.clear(); measureCards();
  prepareHandPreview();
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
      <div class="detail-meta"><span>${examples.length} ${examples.length === 1 ? 'reference' : 'references'}${examples.length < style.expected ? ' · Examples pending' : ''}</span>${style.sources?.[0] ? `<a href="${escape(safeURL(style.sources[0].url))}" target="_blank" rel="noopener">Read about this direction ↗</a>` : `<a href="./artstyles-300.md" target="_blank" rel="noopener">Original notes ↗</a>`}</div>
    </header>
    ${examples.length ? `<section class="gallery-track" id="gallery-track" aria-label="${escape(style.name)} references">
      <div class="gallery-viewport"><div class="gallery-label"><span>( reference studies )</span><span id="gallery-hint">Select to view</span></div>
        <div class="gallery-stage" id="gallery-stage">${examples.map((example,index) => `<figure class="reference${example.height > example.width * 1.45 ? ' reference-tall' : ''}" data-reference="${index}">
          <button class="reference-open" data-open-image="${index}" aria-label="View reference ${index + 1}: ${escape(example.title)}"><img src="${escape(safeURL(index < 2 ? example.image : example.thumbnail || example.image))}" data-full-src="${escape(safeURL(example.image))}" alt="${escape(example.title)}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer" width="${example.width}" height="${example.height}"><span class="image-unavailable" hidden>Image unavailable.<br>Select to retry ↗</span></button>
          <figcaption><span>${String(index+1).padStart(2,'0')} / ${String(examples.length).padStart(2,'0')}</span>${example.url ? `<a href="${escape(safeURL(example.url))}" target="_blank" rel="noopener">${sourceLabel(example)} ↗<span class="sr-only">: ${escape(example.title)}</span></a>` : '<span>Selected reference</span>'}</figcaption>
        </figure>`).join('')}</div>
        <div class="gallery-controls"><span class="gallery-current" id="gallery-current" aria-live="off">01 / ${String(examples.length).padStart(2,'0')}</span><div class="gallery-buttons"><button id="gallery-prev" aria-label="Previous reference">←</button><button id="gallery-next" aria-label="Next reference">→</button></div></div>
      </div></section>` : ''}
    ${examples.length < style.expected ? `<aside class="pending"><span class="mono">Examples pending</span><p>${style.expected - examples.length} more ${style.expected - examples.length === 1 ? 'reference' : 'references'} to come.</p></aside>` : ''}
    ${examples.length ? '<p class="reference-note"><a href="./sources.html">Sources & credits ↗</a></p>' : ''}
    <a class="next-style" href="#/style/${next.id}"><span>Next style ↗</span><strong>${escape(next.name)}</strong></a>
  </article>`;
  $('#detail-page').querySelectorAll('.reference img').forEach(img => {
    const button=img.parentElement;
    const state=failed => {
      button.dataset.failed=String(failed); img.hidden=failed;
      const message=button.querySelector('.image-unavailable'); message.hidden=!failed;
      message.innerHTML='Image unavailable.<br>Select to retry ↗';
    };
    img.addEventListener('error',()=>state(true));
    img.addEventListener('load',()=>state(false));
    if (img.complete && !img.naturalWidth) state(true);
  });
  setupGallery();
  const version = routeVersion;
  detailReady = import('./lib/background.js').then(({ mountBackground }) => {
    if (version !== routeVersion || currentStyle?.id !== style.id) return;
    return mountBackground($('#detail-background'), frozenPalette, paused).then(instance => {
      if (version !== routeVersion) instance.destroy();
      else background = instance;
    });
  }).catch(() => { /* The fixed palette remains usable without decoration. */ });
  document.title = `${style.name} — hamanti`;
}
function setupGallery() {
  const oldTrack=$('#gallery-track');
  const previousIndex=Number(oldTrack?.dataset.active || 0);
  const wasBarrel=oldTrack?.classList.contains('barrel');
  const oldBounds=oldTrack?.getBoundingClientRect();
  const viewingGallery=oldBounds && oldBounds.top<innerHeight/2 && oldBounds.bottom>innerHeight/2;
  galleryCleanup?.();
  galleryCleanup = galleryUpdate = galleryMove = null;
  const track = $('#gallery-track');
  if (!track) return;
  const stage = $('#gallery-stage'), cards = [...track.querySelectorAll('.reference')];
  cards.forEach(card => { card.style.transform = ''; card.style.opacity = ''; card.classList.remove('is-active'); card.querySelectorAll('button,a').forEach(el => el.removeAttribute('tabindex')); });
  track.classList.remove('barrel'); track.style.height = ''; stage.style.transform = '';
  $('#gallery-hint').textContent = 'Select to view';
  const loadFull = index => {
    const img=cards[index]?.querySelector('img');
    if(img?.dataset.fullSrc && img.getAttribute('src')!==img.dataset.fullSrc) img.src=img.dataset.fullSrc;
  };
  if (!desktop.matches || paused || cards.length < 3) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){loadFull(cards.indexOf(entry.target));observer.unobserve(entry.target);}
    }),{rootMargin:'400px'});
    cards.forEach(card=>observer.observe(card));
    galleryCleanup=()=>observer.disconnect();
    galleryMove=(index,options={}) => smoothTo(cards[index],options);
    galleryUpdate=()=>{
      let nearest=0, distance=Infinity;
      cards.forEach((card,index)=>{
        const bounds=card.getBoundingClientRect();
        const offset=Math.abs(bounds.top+bounds.height/2-innerHeight/2);
        if(offset<distance){nearest=index;distance=offset;}
      });
      track.dataset.active=String(nearest);
    };
    if (wasBarrel && viewingGallery) galleryMove(previousIndex,{immediate:true});
    lenis?.resize(); requestUpdate(); return;
  }
  track.classList.add('barrel');
  $('#gallery-hint').textContent = 'Scroll to turn · Select to view';
  const radius = Math.max(900, Math.min(innerWidth * .8, 1550)), step = 360 / cards.length;
  track.style.height = `${cards.length * 65 + 100}svh`;
  stage.style.setProperty('--radius', `${radius}px`);
  let active = -1;
  cards.forEach((card,i) => {
    card.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
  });
  const move = (index,options={}) => {
    index = Math.max(0, Math.min(cards.length - 1, index));
    smoothTo(track.getBoundingClientRect().top + scrollY + index / (cards.length - 1) * (track.offsetHeight - innerHeight),options);
  };
  galleryMove=move;
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
    track.dataset.active=String(index);
    [active-1,active,active+1].forEach(loadFull);
    cards.forEach((card,i) => { card.classList.toggle('is-active', i === active); card.querySelectorAll('button,a').forEach(el => el.tabIndex = i === active ? 0 : -1); });
    $('#gallery-current').textContent = `${String(index+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
    $('#gallery-prev').disabled = index === 0; $('#gallery-next').disabled = index === cards.length - 1;
  };
  galleryCleanup = () => {
    $('#gallery-prev')?.removeEventListener('click', prev); $('#gallery-next')?.removeEventListener('click', next);
    track.removeEventListener('keydown', keyboard);
  };
  lenis?.resize();
  if (!wasBarrel && viewingGallery) move(previousIndex,{immediate:true});
  requestUpdate();
}
async function cover(type, render) {
  const overlay = $('#transition');
  const surfaces=[$('.masthead'),$('#main'),$('#footer')];
  surfaces.forEach(element=>element.inert=true);
  handPreviewAPI?.stop();
  lenis?.stop();
  try {
    if (type === 'curtains') { await mixedCurtains(overlay, render, reduced.matches); return; }
    if (paused) { render(); return; }
    overlay.className = `transition active ${type}`;
    overlay.dataset.phase='closing';
    const line = overlay.querySelector('.transition-line');
    line.style.clipPath='inset(50% 49.95%)';
    await animate(line, { clipPath:['inset(50% 49.95%)','inset(0% 49.95%)','inset(0% 0%)'] }, { duration:.65, times:[0,.45,1], ease:[.76,0,.24,1] });
    line.style.clipPath='inset(0%)';
    overlay.dataset.phase='covered';
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    await render();
    if(currentStyle)await detailReady;
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    overlay.dataset.phase='revealing';
    await animate(line, { clipPath:['inset(0% 0%)','inset(0% 0% 0% 100%)'] }, { duration:.45, ease:[.76,0,.24,1] });
  } finally {
    overlay.className='transition';overlay.querySelector('.transition-line').style.clipPath='';delete overlay.dataset.phase;lenis?.start();
    surfaces.forEach(element=>element.inert=false);
    pendingFocus?.focus({preventScroll:true}); pendingFocus=null;
  }
}
function showRoute(hash, { returnToIndex = false, focus = true, animateTitle = true, restoreScroll } = {}) {
  const route=resolveRoute(hash,handbook.styles);
  hash=route.hash;
  if(route.invalid) history.replaceState(history.state,'',`${location.pathname}${location.search}${hash}`);
  $('#route-notice').hidden=!route.invalid;
  syncFilters();
  routeVersion++; background?.destroy(); background = null; galleryCleanup?.(); galleryCleanup = galleryUpdate = galleryMove = null;
  $('#lightbox').close();
  const style = route.style;
  const wasDetail = Boolean(currentStyle);
  if (style && !wasDetail) homeScroll = $('#home-page').scrollLeft;
  document.body.classList.toggle('detail-mode', Boolean(style));
  $('#home-page').hidden = Boolean(style); $('#detail-page').hidden = !style;
  if (style) {
    currentStyle = style; $('#main').after($('#footer'));
    setupMotion(); renderDetail(style); lenis?.resize(); smoothTo(Number.isFinite(restoreScroll)?restoreScroll:0, { immediate:true });
    if (focus) pendingFocus=$('.detail-title');
  } else {
    currentStyle = null; $('#detail-page').replaceChildren(); document.title = 'hamanti — 300 ways of seeing';
    $('#home-track').append($('#footer')); window.scrollTo({top:0,behavior:'instant'});
    setupMotion();
    const destination = Number.isFinite(restoreScroll) ? restoreScroll : hash === '#/index' ? returnToIndex && homeScroll ? homeScroll : $('#index') : hash === '#/about' ? $('#about') : 0;
    smoothTo(destination, { immediate:true });
    if (focus) {
      pendingFocus=returnToIndex && lastStyleId ? $(`[data-style="${lastStyleId}"]`) || $('#main') : $('#main');
    }
    if (!hash.startsWith('#/index') && animateTitle) typeTitle();
    else { clearTimeout(titleTimer); $('#type-title').textContent='hamanti'; $('.hero').classList.remove('is-typing'); }
  }
  lenis?.resize(); bindControls(); requestUpdate();
  measureCards();
  landscape?.update();
  if (!navigationBusy) { pendingFocus?.focus({preventScroll:true}); pendingFocus=null; }
}
document.addEventListener('click', async event => {
  const image = event.target.closest('[data-open-image]');
  if (image && !navigationBusy) {
    if (image.dataset.failed==='true') {
      const img=image.querySelector('img'); image.querySelector('.image-unavailable').textContent='Retrying image…';
      img.src=img.dataset.fullSrc;
    } else viewer.open(Number(image.dataset.openImage));
    return;
  }
  const link = event.target.closest('a[href^="#/"]');
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || !handbook) return;
  event.preventDefault(); if (navigationBusy) return;
  savePagePosition();
  const hash = link.getAttribute('href');
  if (!currentStyle && ['#/index','#/about'].includes(hash)) {
    history.pushState({},'',hash); smoothTo($(hash === '#/about' ? '#about' : '#index')); return;
  }
  navigationBusy = true;
  try {
    const returningHome = !hash.startsWith('#/style/');
    await cover(returningHome ? 'curtains' : 'line', () => {
      history.pushState({},'',hash); showRoute(hash, {returnToIndex:link.hasAttribute('data-return'),animateTitle:!returningHome});
    });
  } finally { navigationBusy = false; }
});
addEventListener('popstate', () => { if (handbook) showRoute(location.hash, {returnToIndex:true,restoreScroll:location.hash.startsWith('#/style/')?history.state?.detailScroll:history.state?.homeScroll,animateTitle:false}); });
const scrolled=()=>{requestUpdate();clearTimeout(scrollSaveTimer);scrollSaveTimer=setTimeout(savePagePosition,180);};
addEventListener('scroll', scrolled, {passive:true});
$('#home-page').addEventListener('scroll',()=>{
  scrolled();
},{passive:true});
// Native horizontal touch/trackpad scrolling stays available with motion off.
$('#home-page').addEventListener('wheel',event => {
  syncNativeScroll();
  if (!paused || currentStyle || event.ctrlKey || event.target.closest('select')) return;
  const delta = Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  event.preventDefault();
  $('#home-page').scrollLeft += delta * (event.deltaMode===1 ? 16 : event.deltaMode===2 ? innerWidth : 1);
},{passive:false});
addEventListener('resize', () => {
  if (!handbook || !$('#error').hidden) return;
  if (currentStyle) setupGallery();
  else {
    const anchor=homeAnchor;
    lenis?.resize(); measureCards();
    if(anchor){
      const section=anchor.id==='hero' ? $('.hero') : document.getElementById(anchor.id);
      const unit=anchor.id==='index' && cardLayout ? cardLayout.pitch : section.offsetWidth;
      smoothTo(section.offsetLeft+anchor.position*unit,{immediate:true});
    }
  }
  requestUpdate();
}, {passive:true});
$('#motion-toggle').addEventListener('click', () => {
  savedPause = !savedPause; paused = shouldPauseMotion(reduced.matches,savedPause);
  try { localStorage.setItem('hamanti-motion', paused ? 'paused' : 'running'); } catch {}
  setupMotion();
  if (paused) { clearTimeout(titleTimer); $('#type-title').textContent = 'hamanti'; $('.hero').classList.remove('is-typing'); }
});
reduced.addEventListener('change', () => { paused = shouldPauseMotion(reduced.matches,savedPause); setupMotion(); });
$('.skip-link').addEventListener('click',event=>{event.preventDefault();$('#main').focus({preventScroll:true});});
document.addEventListener('keydown', event => {
  if (opening.active || navigationBusy || event.ctrlKey || event.metaKey || event.altKey || document.activeElement.isContentEditable) return;
  if (event.key === '/' && !currentStyle && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus({preventScroll:true}); smoothTo($('#index')); }
  if (currentStyle || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const card = document.activeElement.closest('.style-card');
  if (card && ['ArrowLeft','ArrowRight'].includes(event.key)) {
    const cards = [...document.querySelectorAll('.style-card')], index = cards.indexOf(card);
    const nextIndex = Math.max(0,Math.min(cards.length-1,index+(event.key==='ArrowRight'?1:-1)));
    const next = cards[nextIndex];
    event.preventDefault(); next?.focus({preventScroll:true});
    if (cardLayout) {
      const destination = cardLayout.sectionStart + (nextIndex-(cardLayout.slots-1)/2)*cardLayout.pitch;
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
    if(handReviewEnabled)params.set('preview','hands');
    if (filters.query) params.set('q', filters.query);
    if (filters.letter !== 'all') params.set('letter', filters.letter);
    history.replaceState({...history.state,homeScroll:$('#index').offsetLeft},'',`${location.pathname}${params.size ? '?' + params : ''}#/index`);
    $('#route-notice').hidden=true;
  });
}
$('#clear-filters').addEventListener('click', () => {
  filters.query = ''; filters.letter = 'all';
  $('#search').value = ''; $('#letter-filter').value = 'all';
  history.replaceState({...history.state,homeScroll:$('#index').offsetLeft},'',`${location.pathname}${handReviewEnabled?'?preview=hands':''}#/index`); renderIndex(); smoothTo($('#index'),{immediate:true}); $('#search').focus();
});
try {
  handbook = await loadHandbook({signal:AbortSignal.timeout(20000)});
  opening.progress(20);
  handbook.styles.sort((a,b) => a.name.localeCompare(b.name, 'en', {sensitivity:'base',numeric:true}));
  handbook.styles.forEach((style,index) => { style.rank = index + 1; });
  const letters = [...new Set(handbook.styles.map(style => style.name.charAt(0).toLocaleUpperCase()))];
  $('#letter-filter').insertAdjacentHTML('beforeend', letters.map(letter => `<option value="${escape(letter)}">${escape(letter)}</option>`).join(''));
  Object.assign(filters,readIndexFilters(location.search,letters));
  $('#search').value = filters.query; $('#letter-filter').value = filters.letter;
  $('#footer-coverage').textContent = `${handbook.stats.examples.toLocaleString()} references`;
  $('.index-total').innerHTML = `${handbook.styles.length} directions<br>A — Z`;
  introWords(); renderIndex(); showRoute(location.hash, {focus:false});
  opening.alignTitle();
  clearTimeout(titleTimer); lenis?.stop();
  const abortWarmup = new AbortController();
  const assets = openingAssets(handbook.styles, indexCards.map(card => handbook.styles.find(style => style.id === +card.dataset.style)), currentStyle?.examples || []);
  document.body.dataset.preloadStyles = String(assets.styleCount);
  const progress = {fonts:0, landscape:0, images:0};
  const updateProgress = () => opening.progress(Math.min(99,20 + progress.fonts*10 + progress.landscape*65 + progress.images*5));
  const fontsReady = Promise.all([
    document.fonts.load('800 48px "Syne Variable"'),
    document.fonts.load('400 16px "Manrope Variable"'),
    document.fonts.load('400 40px "Instrument Serif"'),
    document.fonts.load('italic 400 40px "Instrument Serif"'),
    document.fonts.load('400 12px "IBM Plex Mono"'),
  ]).then(() => document.fonts.ready).then(() => {
    lenis?.resize(); measureCards(); requestUpdate();
    opening.alignTitle();
    progress.fonts = 1; updateProgress(); return true;
  }).catch(() => false);
  const landscapeReady = import('./lib/shanshui.js').then(async({createShanShui}) => {
    await fontsReady;
    const getMaxScroll=()=>{
      const gutter=parseFloat(getComputedStyle($('#index')).paddingLeft)||innerWidth*.04;
      const fallback={pitch:(innerWidth-2*gutter)/5,sectionStart:innerWidth*1.86,slots:5};
      const layout=cardLayout||fallback;
      return Math.max($('#home-page').scrollWidth-innerWidth,layout.sectionStart+fanScrollLength({...layout,count:handbook.styles.length})+innerWidth);
    };
    landscape = createShanShui($('#landscape'),$('#home-page'),{getMaxScroll,onProgress:(done,total)=>{
      progress.landscape=done/total;opening.stage(`Drawing the landscape · ${done} / ${total}`);updateProgress();
    }});
    return landscape.ready;
  }).then(ready => { if (ready) { progress.landscape = 1; updateProgress(); } return ready; })
    .catch(() => { $('#landscape').classList.add('landscape-unavailable'); return false; });
  const warmingImages = warmImages(assets.urls, {
    signal:abortWarmup.signal,
    onProgress:(done,total) => { progress.images = total ? done/total : 1; updateProgress(); },
  });
  // Image hosts may be slow, but neither an image deadline nor an "enter now"
  // button may bypass full landscape preparation. All 300 positions are cached.
  let imageDeadline;
  const imagesReady=Promise.race([warmingImages,new Promise(resolve=>{imageDeadline=setTimeout(()=>resolve({complete:false}),8000);})]);
  const [fonts,scene,images,hands]=await Promise.all([fontsReady,landscapeReady,imagesReady,prepareHandPreview()]);
  clearTimeout(imageDeadline);abortWarmup.abort();
  if(!scene)throw Error('The full landscape could not be prepared.');
  if(!hands)throw Error('The hands could not be prepared.');
  const ready=scene&&hands&&fonts;
  document.body.dataset.preloadState='ready';
  document.body.dataset.preloadImages=images.complete?'ready':'partial';
  opening.stage('300 directions. Ready to explore.');
  // The first Lenis measurement can precede the index's full layout. Restore
  // deep links after fonts and opening assets settle, while still covered.
  if(!currentStyle){
    lenis?.resize();
    if(location.hash==='#/index')smoothTo($('#index'),{immediate:true});
    else if(location.hash==='#/about')smoothTo($('#about'),{immediate:true});
  }
  if (returningFromCredits) await mixedCurtains($('#transition'),()=>opening.finish(ready,{instant:true}),reduced.matches,true);
  else await opening.finish(ready);
  lenis?.resize(); lenis?.start(); measureCards(); requestUpdate();
  if (!returningFromCredits && !currentStyle && !location.hash.startsWith('#/index')) typeTitle();
} catch (error) {
  await opening.finish(false); $('#home-page').hidden=true; $('#error').hidden = false;
  $('#error').innerHTML = '<h1>The handbook couldn’t open.</h1><p>Check your connection and try again.</p><button class="text-button" id="retry-handbook">Try again ↗</button><a href="./artstyles-300.md">Read the original notes ↗</a>';
  $('#retry-handbook').addEventListener('click',()=>location.reload());
}
