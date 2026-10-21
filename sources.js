import { mixedCurtains } from './lib/page-transition.js';
let busy=false;

document.addEventListener('click', async event => {
  const link = event.target.closest('[data-home]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if(busy)return;
  busy=true;
  await mixedCurtains(document.querySelector('#source-transition'),()=>{
    try{sessionStorage.setItem('hamanti-home-return','1');}catch{}
    location.assign(link.href);
    // Keep the cover closed until the new document prepares its iris reveal.
    return new Promise(()=>{});
  },matchMedia('(prefers-reduced-motion: reduce)').matches);
});
