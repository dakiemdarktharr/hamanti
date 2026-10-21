import test from 'node:test';
import assert from 'node:assert/strict';
import { readIndexFilters, resolveRoute, shouldPauseMotion } from '../lib/navigation.js';

test('history restores query and validates the first-letter filter from the URL', () => {
  assert.deepEqual(readIndexFilters('?q=bento&letter=B',['A','B']),{query:'bento',letter:'B'});
  assert.deepEqual(readIndexFilters('?q=clay&letter=Z',['A','B']),{query:'clay',letter:'all'});
  assert.deepEqual(readIndexFilters('',['A','B']),{query:'',letter:'all'});
});
test('unknown routes recover to the index without showing an unrelated style', () => {
  const styles=[{id:47,name:'Bento Grid'}];
  assert.equal(resolveRoute('#/style/47',styles).style,styles[0]);
  assert.deepEqual(resolveRoute('#/style/999',styles),{hash:'#/index',style:null,invalid:true});
  assert.equal(resolveRoute('#/about',styles).invalid,false);
  assert.equal(resolveRoute('#/style/47/garbage',styles).invalid,true);
});
test('a stored preference can never override system reduced motion', () => {
  assert.equal(shouldPauseMotion(true,false),true);
  assert.equal(shouldPauseMotion(true,true),true);
  assert.equal(shouldPauseMotion(false,true),true);
  assert.equal(shouldPauseMotion(false,false),false);
});
