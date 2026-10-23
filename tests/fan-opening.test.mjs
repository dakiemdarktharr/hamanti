import test from 'node:test';
import assert from 'node:assert/strict';
import {fanFrame,fanPose} from '../lib/card-fan.js';
import {landscapePlan} from '../lib/landscape-plan.js';
const layout={count:300,slots:5,pitch:240,sectionStart:3000,gutter:60,cardWidth:240,cardHeight:350,journeyHeight:560};
test('the untouched packet contains five stacked cards, no outgoing pile, and no fan spread',()=>{
  const f=fanFrame(layout,3000,1440);assert.equal(f.spread,0);assert.equal(f.reach,0);assert.equal(f.deposited,0);
  for(let i=0;i<8;i++){
    const p=fanPose(i,layout,f,1440);assert.equal(p.opacity,i<5?1:0);assert.ok(p.rotation===0);
    if(i<5)assert.ok(Math.abs(p.x-720)<=4);
  }
});
test('the lower pile fills only after completed deposits, caps at four, and empties on reversal',()=>{
  const at=n=>fanFrame(layout,3000+(2.6+n)*240,1440).deposited;
  assert.equal(at(0),0);assert.equal(at(1.44),0);assert.equal(at(1.45),1);assert.equal(at(2.45),2);
  assert.equal(at(3.45),3);assert.equal(at(4.45),4);assert.equal(at(200),4);assert.equal(at(0),0);
});
test('the incoming and outgoing cards turn from engraved back to face without changing their navigation entity',()=>{
  for(const side of [-1,1]){
    const at=t=>fanPose(0,layout,{origin:0,centre:-side*(2+t*1.45),spread:1},1440);
    assert.equal(at(0).flip,0);assert.equal(at(1).flip,180);
    assert.ok(at(.5).flip>0&&at(.5).flip<180);
  }
});
test('landscape plans cover every point through the last category within a bounded pixel cache',()=>{
  for(const scroll of [10000,80000,180000]){
    const p=landscapePlan(scroll,1920,1.1,2);
    assert.equal(p.tiles[0].x,0);
    for(let i=1;i<p.tiles.length;i++)assert.equal(p.tiles[i].x,p.tiles[i-1].x+p.tiles[i-1].width);
    const end=p.tiles.at(-1).x+p.tiles.at(-1).width;
    assert.ok(end>=scroll*.52+4096);
    assert.ok(end*800*4*p.density**2<=96*1024*1024+1);
  }
});
