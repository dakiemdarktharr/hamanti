import test from 'node:test';
import assert from 'node:assert/strict';
import {fanFrame,fanPose,fanDeckPose} from '../lib/card-fan.js';

const layout={count:300,slots:7,pitch:240,sectionStart:3500,gutter:72,cardWidth:280,cardHeight:409};
const viewport=1920;
test('seven cards follow a symmetric arc, with an upright raised centre',()=>{
  const frame=fanFrame(layout,layout.sectionStart,viewport);
  const centre=fanPose(3,layout,frame,viewport);
  assert.equal(centre.rotation,0);
  assert.equal(centre.x,viewport/2);
  for(let i=0;i<3;i++){
    const left=fanPose(i,layout,frame,viewport),right=fanPose(6-i,layout,frame,viewport);
    assert.ok(Math.abs(left.x+right.x-viewport)<.00001);
    assert.equal(left.y,right.y);
    assert.equal(left.rotation,-right.rotation);
    assert.ok(left.y>centre.y);
  }
});
test('scrolling forwards and backwards retraces the same fan and pile poses',()=>{
  const offsets=[0,51,169,240,501,700];
  const poses=offsets.map(offset=>fanPose(7,layout,fanFrame(layout,3500+offset,viewport),viewport));
  for(let i=offsets.length-1;i>=0;i--)
    assert.deepEqual(fanPose(7,layout,fanFrame(layout,3500+offsets[i],viewport),viewport),poses[i]);
  const entering=poses[0],arrived=poses.at(-1);
  assert.ok(entering.scale<arrived.scale);
  assert.ok(entering.y<arrived.y);
});
test('small result sets stay centred, and entering/leaving the index moves the whole hand',()=>{
  const one={...layout,count:1};
  assert.equal(fanPose(0,one,fanFrame(one,3500,viewport),viewport).x,viewport/2);
  assert.equal(fanPose(0,one,fanFrame(one,3300,viewport),viewport).x,viewport/2+200);
  assert.equal(fanPose(0,one,fanFrame(one,3700,viewport),viewport).x,viewport/2-200);
  const end=3500+(layout.count-layout.slots)*layout.pitch;
  assert.equal(fanFrame(layout,end,viewport).centre,296);
  assert.equal(fanFrame(layout,end+200,viewport).origin,-200);
});
test('the pile curls meet the main arc without a velocity jump',()=>{
  const epsilon=.00001;
  for(const side of [-1,1]){
    const pose=d=>fanPose(0,layout,{origin:0,centre:-side*d},viewport);
    const before=pose(3-epsilon),edge=pose(3),after=pose(3+epsilon);
    for(const axis of ['x','y','rotation','scale']){
      const entering=(edge[axis]-before[axis])/epsilon;
      const leaving=(after[axis]-edge[axis])/epsilon;
      assert.ok(Math.abs(entering-leaving)<.02,`${side} / ${axis}`);
    }
  }
});
test('cards arrive exactly at both visible decks, on desktop and mobile',()=>{
  for(const slots of [7,5,1.35]) for(const side of [-1,1]){
    const size={...layout,slots};
    const half=slots<2?1:(slots-1)/2;
    const frame={origin:0,centre:-side*(half+1.45)};
    const card=fanPose(0,size,frame,viewport),deck=fanDeckPose(side,size,frame,viewport);
    for(const key of ['x','y','scale'])assert.ok(Math.abs(card[key]-deck[key])<.00001,key);
    assert.ok(Math.abs(card.rotation)<.00001);
  }
});
