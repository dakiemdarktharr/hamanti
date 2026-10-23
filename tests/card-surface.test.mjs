import test from 'node:test';
import assert from 'node:assert/strict';
import {cardSurfacePoint} from '../lib/card-surface.js';
const layout={journeyHeight:600};
const pose={x:720,y:20,rotation:0,scale:1,flip:0};
test('depth masks share the website face position before and after a complete flip',()=>{
  const front=cardSurfacePoint(100,140,pose,layout);
  assert.deepEqual(front,{x:820,y:442,depth:-0});
  const back=cardSurfacePoint(100,140,{...pose,flip:180},layout);
  assert.ok(Math.abs(back.x-620)<1e-9);assert.ok(Math.abs(back.y-front.y)<1e-9);
});
test('an edge-on flip has no stationary front plane and retains its full depth',()=>{
  const a=cardSurfacePoint(-100,140,{...pose,flip:90},layout),b=cardSurfacePoint(100,140,{...pose,flip:90},layout);
  assert.ok(Math.abs(a.x-b.x)<1e-9);assert.ok(a.depth>0&&b.depth<0);
  assert.ok(a.y>b.y,'CSS perspective stretches the near edge');
});
test('card rotation and scale apply to the projected face, including perspective',()=>{
  const base=cardSurfacePoint(70,120,{...pose,flip:55},layout);
  const turned=cardSurfacePoint(70,120,{...pose,flip:55,rotation:90,scale:.5},layout);
  assert.ok(Math.abs(turned.x-(pose.x-(base.y-302)*.5))<1e-9);
  assert.ok(Math.abs(turned.y-(302+(base.x-pose.x)*.5))<1e-9);
});
