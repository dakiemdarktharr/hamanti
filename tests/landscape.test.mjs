import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('../public/shan-shui/compact.js',import.meta.url),'utf8'),context);
const compact=context.compactLandscape;
test('SVG compaction retains paint order and distinct filled subpaths',()=>{
  const input="<polyline points='0,0 10,0 10,10 0,10 0,0' style='fill:red'/><polyline points='20,0 30,0 30,10 20,10 20,0' style='fill:red'/><polyline points='0,0 10,0 10,10 0,10 0,0' style='fill:blue'/>";
  const output=compact(input);
  assert.equal((output.match(/<path /g)||[]).length,2);
  assert.equal((output.match(/M/g)||[]).length,3);
  assert.ok(output.indexOf('fill:red')<output.indexOf('fill:blue'));
});
test('compaction preserves other SVG elements and never collapses a filled contour',()=>{
  const input="<circle r='5'/><polyline points='0,0 1,0 1,0.1 0,0.1 0,0' style='fill:red'/>";
  const output=compact(input);
  assert.ok(output.startsWith("<circle r='5'/>"));
  assert.ok(output.includes('1,0.1'));
});
test('overlapping translucent washes keep their separate compositing operations',()=>{
  const shape="<polyline points='0,0 10,0 10,10 0,10 0,0' style='fill:rgba(34,42,32,0.2)'/>";
  assert.equal((compact(shape+shape).match(/<path /g)||[]).length,2);
});
