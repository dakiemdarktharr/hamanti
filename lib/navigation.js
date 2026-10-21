export function readIndexFilters(search, letters) {
  const params = new URLSearchParams(search);
  const letter = params.get('letter');
  return { query: params.get('q') || '', letter: letters.includes(letter) ? letter : 'all' };
}

export function resolveRoute(hash, styles) {
  if (!hash || ['#/', '#/about', '#/index'].includes(hash)) return { hash: hash || '#/', style: null, invalid: false };
  const match = hash.match(/^#\/style\/(\d+)$/);
  const style = match && styles.find(item => item.id === Number(match[1]));
  return style ? { hash, style, invalid: false } : { hash: '#/index', style: null, invalid: true };
}

export const shouldPauseMotion = (systemReduced, savedPause) => systemReduced || savedPause;
