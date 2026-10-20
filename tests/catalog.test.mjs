import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isFullHD, selectReferences } from '../scripts/compile-catalog.mjs';
import { searchStyles } from '../lib/search.js';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const original = {imageUrl:'manual:first',width:1200,height:2400,reviewStatus:'approved',peopleReview:'no-real-people',url:null};
const media = {'manual:first':{id:'one',checksum:'original',width:1200,height:2400,verified:true}};
const select = (items,stored=media) => selectReferences(items,stored,{manual:true});

test('Full HD requires both native dimensions, in either orientation', () => {
  for (const [width,height] of [[1920,1080],[1080,1920],[2200,2200]]) assert.ok(isFullHD({width,height}));
  for (const [width,height] of [[1919,1080],[1080,1919],[800,4000],[1200,1500],[Infinity,2400]])
    assert.equal(isFullHD({width,height}),false);
});
test('manual references need completed visual review and verified storage', () => {
  assert.equal(select([original]).length,1);
  assert.equal(select([{...original,peopleReview:undefined}]).length,0);
  assert.equal(select([{...original,peopleReview:'casual-photo'}]).length,0);
  assert.equal(select([{...original,reviewStatus:'pending'}]).length,0);
  assert.equal(select([original],{'manual:first':{...media['manual:first'],verified:false}}).length,0);
  assert.equal(select([{...original,peopleReview:'posed-model'}]).length,1);
});
test('neither a large download label nor stored dimensions can excuse a small original', () => {
  assert.equal(select([{...original,width:736,height:1200}]).length,0);
  assert.equal(select([original],{'manual:first':{...media['manual:first'],width:736,height:1200}}).length,0);
});
test('missing manual source links are honest; unsafe links are never published', () => {
  assert.equal(select([original]).length,1);
  assert.equal(select([{...original,url:'javascript:alert(1)'}]).length,0);
  assert.equal(select([{...original,url:'https://www.deviantart.com/example'}]).length,1);
  assert.equal(selectReferences([{...original,url:'https://pinterest.com.evil.example/pin/1/'}],media).length,0);
});
test('duplicate file bytes do not count as distinct references', () => {
  assert.equal(select([original,{...original,imageUrl:'manual:copy'}],{
    ...media,'manual:copy':{...media['manual:first'],id:'two'},
  }).length,1);
});
test('all 300 distinct styles remain searchable, including a misspelled aesthetic', () => {
  assert.equal(catalog.styles.length,300);
  assert.equal(new Set(catalog.styles.map(s=>s.id)).size,300);
  assert.equal(new Set(catalog.styles.map(s=>s.name.toLowerCase())).size,300);
  assert.equal(searchStyles(catalog.styles,'frutigr aero')[0]?.name,'Frutiger Aero');
  assert.equal(searchStyles(catalog.styles,'zzzz-no-such-style').length,0);
});
test('number search follows the visible alphabetical rank rather than old source IDs', () => {
  const sorted = [...catalog.styles].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true}))
    .map((style,index)=>({...style,rank:index+1}));
  assert.equal(searchStyles(sorted,'001')[0]?.name,'Abstract Expressionism');
  assert.equal(searchStyles(sorted,'300')[0]?.name,'Zine aesthetic');
  assert.equal(searchStyles(sorted,'999').length,0);
});
