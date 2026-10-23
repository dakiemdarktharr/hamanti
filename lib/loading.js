import { animate } from 'motion';
import './loading.css';

export function createLoadingScreen(reducedMotion) {
  const screen = document.querySelector('#opening-loader');
  const fill = screen.querySelector('.opening-fill');
  const count = screen.querySelector('.opening-count');
  const meter = screen.querySelector('[role="progressbar"]');
  const word = screen.querySelector('.opening-word');
  const title = document.querySelector('#type-title');
  let progress = 0, target = 0, animation, closed = false;
  function alignTitle() {
    const rect = title.getBoundingClientRect();
    const font = getComputedStyle(title);
    for (const property of ['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','fontVariationSettings','fontFeatureSettings','fontKerning','letterSpacing','lineHeight'])
      word.style[property] = font[property];
    if (!rect.width || !rect.height) {
      Object.assign(word.style,{left:'var(--gutter)',top:`${(innerHeight-parseFloat(font.fontSize)*.88)/2}px`,width:'auto',height:'auto'});
      return;
    }
    const scroller=document.querySelector('#home-page');
    const left=rect.left+(scroller.hidden ? 0 : scroller.scrollLeft);
    Object.assign(word.style, {left:`${left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
  }
  const titleObserver = new ResizeObserver(alignTitle);
  alignTitle();
  titleObserver.observe(title);
  addEventListener('resize',alignTitle,{passive:true});
  function paint(value) {
    progress = value;
    fill.style.clipPath = `inset(0 ${100-value}% 0 0)`;
    count.textContent = `${Math.round(value).toString().padStart(2,'0')}%`;
    meter.setAttribute('aria-valuenow', String(Math.round(value)));
    const t=Math.max(0,Math.min(1,(value-48)/52)),fade=t*t*(3-2*t);
    screen.style.setProperty('--pencil-opacity',String(1-fade));
    screen.style.setProperty('--guide-opacity',String(Math.max(0,1-value/86)));
    screen.dataset.build=String(Math.round(value));
  }
  return {
    alignTitle,
    get active() { return !closed; },
    stage(message){if(!closed)meter.textContent=message;},
    progress(value) {
      if (closed) return;
      target = Math.max(target, Math.min(100,value));
      animation?.stop();
      if (reducedMotion()) paint(target);
      else animation = animate(progress, target, {duration:.32, ease:'easeOut', onUpdate:paint});
    },
    async finish(complete = true, {instant = false} = {}) {
      if (closed) return;
      if (complete && !instant) { this.progress(100); await animation; if(!reducedMotion())await new Promise(resolve=>setTimeout(resolve,550)); }
      closed = true;
      animation?.stop();
      document.body.classList.remove('is-loading');
      alignTitle();
      document.querySelectorAll('[data-opening-inert]').forEach(el => { el.inert = false; el.removeAttribute('data-opening-inert'); });
      document.querySelector('#main').removeAttribute('aria-busy');
      const restoreFocus = screen.contains(document.activeElement);
      if (!instant && !reducedMotion()) await animate(screen, {opacity:0}, {duration:.28, ease:'easeOut'});
      screen.remove();
      titleObserver.disconnect(); removeEventListener('resize',alignTitle);
      if (restoreFocus) document.querySelector('#main').focus({preventScroll:true});
    },
  };
}
