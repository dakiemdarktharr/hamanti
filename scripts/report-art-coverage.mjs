import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = name => fs.readFile(new URL(`data/research/${name}`, root), 'utf8').then(JSON.parse);
const [styles, discovered, candidates, reviewed, approved] = await Promise.all([
  'art-influences.json', 'art-hd-discovered.json', 'art-hd-candidates.json',
  'art-visual-review.json', 'art-hd-approved.json',
].map(read));
const coverage = styles.map(style => {
  const items = approved.filter(item => item.styleName === style.name);
  return {
    name: style.name, legacyId: style.legacyId, approved: items.length,
    missing: Math.max(0, 8 - items.length),
    status: items.length >= 8 ? 'complete' : items.length ? 'partial' : 'pending',
    sourcePages: new Set(discovered.filter(item => item.styleName === style.name).map(item => item.url)).size,
    candidates: candidates.filter(item => item.styleName === style.name).length,
  };
});
const uniqueApproved = [...new Map(approved.map(item => [item.imageUrl, item])).values()];
const summary = {
  styles: styles.length, sourcePages: new Set(discovered.map(item => item.url)).size,
  discoveredSlots: discovered.length, distinctImageUrls: new Set(discovered.map(item => item.imageUrl)).size,
  nativeHDCandidates: candidates.length, reviewed: reviewed.length, approved: approved.length,
  rejected: reviewed.filter(item => item.reviewStatus === 'rejected').length,
  peopleReview: {
    noRealPeople: approved.filter(item => item.peopleReview === 'no-real-people').length,
    posedModel: approved.filter(item => item.peopleReview === 'posed-model').length,
    unreviewed: approved.filter(item => !['no-real-people', 'posed-model'].includes(item.peopleReview)).length,
    excludedForPeople: reviewed.filter(item => item.peopleReview === 'real-people-rejected').length,
  },
  distinctApproved: uniqueApproved.length, approvedBytes: uniqueApproved.reduce((sum, item) => sum + item.bytes, 0),
  completeStyles: coverage.filter(item => item.status === 'complete').length,
  partialStyles: coverage.filter(item => item.status === 'partial').length,
  pendingStyles: coverage.filter(item => item.status === 'pending').length,
  usableSlots: coverage.reduce((sum, item) => sum + Math.min(8, item.approved), 0),
  remainingSlots: coverage.reduce((sum, item) => sum + item.missing, 0),
};
await fs.writeFile(new URL('data/research/art-hd-coverage.json', root), JSON.stringify({ updatedAt: new Date().toISOString(), summary, coverage }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
console.log(JSON.stringify(coverage.filter(item => item.missing).sort((a, b) => b.missing - a.missing), null, 2));
