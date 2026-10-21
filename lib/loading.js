import { animate } from 'motion';
import './loading.css';

export function createLoadingScreen(reducedMotion) {
  const screen = document.querySelector('#opening-loader');
  const fill = screen.querySelector('.opening-fill');
  const count = screen.querySelector('.opening-count');
  const meter = screen.querySelector('[role="progressbar"]');
  const enter = screen.querySelector('button');
  let progress = 0, target = 0, animation, closed = false, canEnter = false;
  let release;
  const skipped = new Promise(resolve => { release = resolve; });
  const timer = setTimeout(() => { if (canEnter && !closed) enter.hidden = false; }, 6000);
  const started = performance.now();
  enter.addEventListener('click', () => release(false), {once:true});
  function paint(value) {
    progress = value;
    fill.style.clipPath = `inset(0 ${100-value}% 0 0)`;
    count.textContent = `${Math.round(value).toString().padStart(2,'0')}%`;
    meter.setAttribute('aria-valuenow', String(Math.round(value)));
  }
  return {
    skipped,
    get active() { return !closed; },
    enableEntry() { canEnter = true; if (performance.now()-started >= 6000) enter.hidden = false; },
    progress(value) {
      if (closed) return;
      target = Math.max(target, Math.min(100,value));
      animation?.stop();
      if (reducedMotion()) paint(target);
      else animation = animate(progress, target, {duration:.32, ease:'easeOut', onUpdate:paint});
    },
    async finish(complete = true) {
      if (closed) return;
      clearTimeout(timer);
      if (complete) { this.progress(100); await animation; }
      closed = true;
      animation?.stop();
      document.body.classList.remove('is-loading');
      document.querySelectorAll('[data-opening-inert]').forEach(el => { el.inert = false; el.removeAttribute('data-opening-inert'); });
      document.querySelector('#main').removeAttribute('aria-busy');
      const restoreFocus = screen.contains(document.activeElement);
      if (!reducedMotion()) await animate(screen, {opacity:0}, {duration:.28, ease:'easeOut'});
      screen.remove();
      if (restoreFocus) document.querySelector('#main').focus({preventScroll:true});
    },
  };
}
