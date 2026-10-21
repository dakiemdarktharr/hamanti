import test from 'node:test';
import assert from 'node:assert/strict';
import {openingAssets, warmImages} from '../lib/preload.js';

test('opening preparation covers 40% of styles, uses thumbnails and prioritizes the current route', () => {
  const styles = Array.from({length:300},(_,i) => ({examples:[{image:`full-${i}`,thumbnail:`thumb-${i}`}]}));
  const result = openingAssets(styles,styles.slice(250),[{image:'detail-1'},{image:'detail-2'},{image:'detail-3'}]);
  assert.equal(result.styleCount,120);
  assert.deepEqual(result.urls.slice(0,3),['detail-1','detail-2','thumb-250']);
  assert.ok(result.urls.includes('thumb-119'));
  assert.ok(!result.urls.includes('thumb-120'));
  assert.ok(!result.urls.includes('full-0'));
  assert.ok(!result.urls.includes('detail-3'));
  assert.equal(new Set(result.urls).size,result.urls.length);
});

test('preloading bounds simultaneous requests and continues past failed images', async () => {
  let active=0, peak=0, last=0;
  const result = await warmImages(['a','b','bad','c','d','e'],{
    concurrency:2,
    onProgress:done => { assert.ok(done>=last); last=done; },
    load:async url => { active++; peak=Math.max(peak,active); await new Promise(resolve=>setImmediate(resolve)); active--; if(url==='bad') throw new Error('offline'); },
  });
  assert.equal(peak,2);
  assert.deepEqual(result,{settled:6,failed:1,complete:false});
});

test('leaving the loader cancels queued requests instead of downloading the whole index', async () => {
  const controller = new AbortController();
  const visited=[];
  const result = await warmImages(['a','b','c'],{signal:controller.signal,concurrency:1,
    load:async url => { visited.push(url); controller.abort(); },
  });
  assert.deepEqual(visited,['a']);
  assert.equal(result.complete,false);
});
