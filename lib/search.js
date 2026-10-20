const normalize = value => String(value).normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function oneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}

export function searchStyles(styles, query) {
  if (/^\d{1,3}$/.test(query.trim()))
    return styles.filter(style => (style.rank ?? style.id) === Number(query.trim()));
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return styles;
  return styles.filter(style => {
    const text = normalize(`${style.rank ?? style.id} ${style.name} ${style.description} ${style.groupName} ${(style.tags || []).join(' ')} ${(style.aliases || []).join(' ')}`);
    const words = text.split(' ');
    return terms.every(term => text.includes(term) || term.length >= 5 && words.some(word => oneEdit(term, word)));
  });
}
