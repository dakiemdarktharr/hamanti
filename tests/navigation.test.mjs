import test from 'node:test';
import assert from 'node:assert/strict';
import { coveredNavigation } from '../lib/page-transition.js';

test('navigation commits only after the full cover finishes, then reveals', async () => {
  const events=[];
  let finishCover, finishCommit;
  const navigation=coveredNavigation(
    ()=>{events.push('closing');return new Promise(resolve=>{finishCover=resolve;});},
    ()=>{events.push('commit');return new Promise(resolve=>{finishCommit=resolve;});},
    ()=>events.push('reveal'),
  );
  await Promise.resolve();
  assert.deepEqual(events,['closing']);
  finishCover(); await Promise.resolve();
  assert.deepEqual(events,['closing','commit']);
  finishCommit(); await navigation;
  assert.deepEqual(events,['closing','commit','reveal']);
});

test('a failed cover never changes the current route', async () => {
  let committed=false;
  await assert.rejects(coveredNavigation(
    ()=>Promise.reject(new Error('interrupted')),
    ()=>{committed=true;},()=>{},
  ),/interrupted/);
  assert.equal(committed,false);
});
