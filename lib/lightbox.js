// One viewer for every reference. Native dialog provides focus containment and Escape.
export function createImageViewer({ dialog, getStyle, onOpen, onClose }) {
  const find = selector => dialog.querySelector(selector);
  const image = find('#lightbox-image'), surface = find('.lightbox-image');
  const previous = find('#lightbox-prev'), next = find('#lightbox-next');
  const status = find('#lightbox-status'), retry = find('#lightbox-retry');
  let index = 0, opener, styleId;
  const safeURL = value => {
    try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; }
  };
  function setState(state) {
    surface.dataset.state = state;
    surface.setAttribute('aria-busy', String(state === 'loading'));
    status.textContent = state === 'error' ? 'This image could not load.' : state === 'loading' ? 'Loading reference…' : '';
    if (state !== 'error' && document.activeElement === retry && dialog.open) find('#lightbox-close').focus({preventScroll:true});
    retry.hidden = state !== 'error';
  }
  function load() {
    setState('loading');
    image.src = safeURL(getStyle().examples[index].image);
  }
  function show(value) {
    const style = getStyle();
    if (!style?.examples[value]) return;
    index = value;
    const example = style.examples[index];
    image.alt = example.title;
    find('#lightbox-title').textContent = example.title;
    find('#lightbox-counter').textContent = `${index + 1} / ${style.examples.length} · ${style.name}`;
    const source = find('#lightbox-source');
    source.href = safeURL(example.url);
    source.textContent = `${({pin:'Pin',board_or_idea:'Board / idea',website:'Website',museum:'Collection',upload:'Selected reference'})[example.kind] || 'Source'} ↗`;
    source.hidden = !safeURL(example.url);
    const focused=document.activeElement;
    if (dialog.open && (focused === previous && index === 0 || focused === next && index === style.examples.length - 1 || focused === source && source.hidden))
      find('#lightbox-close').focus({preventScroll:true});
    previous.disabled = index === 0; next.disabled = index === style.examples.length - 1;
    previous.hidden = next.hidden = style.examples.length < 2;
    surface.scrollTop = 0;
    load();
  }
  image.addEventListener('load', () => setState('ready'));
  image.addEventListener('error', () => setState('error'));
  retry.addEventListener('click', load);
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  find('#lightbox-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const count = getStyle()?.examples.length || 0;
    const value = ({ArrowLeft:index - 1, ArrowRight:index + 1, Home:0, End:count - 1})[event.key];
    if (value === undefined) return;
    event.preventDefault(); event.stopPropagation();
    show(Math.max(0, Math.min(count - 1, value)));
  });
  dialog.addEventListener('close', () => {
    if (getStyle()?.id === styleId) {
      const target=onClose(index) || opener;
      if (target?.isConnected) target.focus({preventScroll:true});
    }
  });
  return {
    open(value) {
      if (!getStyle()?.examples[value]) return;
      opener = document.activeElement; styleId = getStyle().id;
      show(value); onOpen();
      if (!dialog.open) dialog.showModal();
      find('#lightbox-close').focus();
    },
  };
}
