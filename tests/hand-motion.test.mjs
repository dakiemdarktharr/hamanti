import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fanFrame,fanPose,fanDeckPose} from '../lib/card-fan.js';
import {handFrame,handAttachment,cardContact,demoScroll,samplePad} from '../lib/hand-motion.js';
const motion=JSON.parse(readFileSync(new URL('../public/hands/hand-motion.json',import.meta.url)));
const layout={count:300,slots:5,pitch:185,sectionStart:3500,gutter:60,cardWidth:230,cardHeight:336,journeyHeight:560};
const stateAt=(scroll,l=layout)=>{const frame=fanFrame(l,scroll,1440);return {state:handFrame(l,frame,motion),poseAt:i=>fanPose(i,l,frame,1440),frame};};

test('the runtime export contains only hands and no card geometry, images or animation targets',()=>{
  const bytes=readFileSync(new URL('../public/hands/hands-only.glb',import.meta.url));
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length));
  assert.equal(gltf.meshes.length,6);assert.equal(gltf.skins.length,2);
  assert.equal(gltf.images?.length||0,0);assert.equal(gltf.textures?.length||0,0);
  for(const node of gltf.nodes)assert.doesNotMatch(node.name||'',/card|rank|suit|pip|deck/i);
  for(const asset of motion.assets)assert.doesNotMatch(asset,/card|deck/i);
  assert.deepEqual(Object.keys(motion.poses[0]).sort(),['left','right']);
  assert.equal(gltf.animations.length,2);
});

test('hand attachment never mutates original card or end-deck poses across desktop and mobile layouts',()=>{
  for(const slots of [7,5,1.35])for(let offset=0;offset<9;offset+=.125){
    const l={...layout,slots},scroll=l.sectionStart+offset*l.pitch;
    const {state,frame}=stateAt(scroll,l);
    const cards=Array.from({length:18},(_,i)=>Object.freeze(fanPose(i,l,frame,1440)));
    const decks=[-1,1].map(side=>Object.freeze(fanDeckPose(side,l,frame,1440)));
    const before=JSON.stringify({cards,decks});
    for(const side of ['left','right'])handAttachment(side,l,state,i=>cards[i]);
    assert.equal(JSON.stringify({cards,decks}),before);
    for(let i=0;i<cards.length;i++)assert.deepEqual(cards[i],fanPose(i,l,frame,1440));
  }
});

test('thumb anchors follow the actual rotated and scaled card contact, including spring displacement',()=>{
  const {state,poseAt}=stateAt(layout.sectionStart+2.4*layout.pitch);
  for(const side of ['left','right']){
    const getPose=i=>({...poseAt(i),rotation:poseAt(i).rotation+1.7,y:poseAt(i).y+3});
    const anchor=handAttachment(side,layout,state,getPose);
    const a=cardContact(getPose(anchor.from),layout,side),b=cardContact(getPose(anchor.to),layout,side);
    assert.ok(Math.abs(anchor.x-(a.x+(b.x-a.x)*anchor.regrip))<1e-9);
    assert.ok(Math.abs(anchor.y-(a.y+(b.y-a.y)*anchor.regrip))<1e-9);
  }
});

test('forward and reverse demo scroll retrace the original fan and hand targets',()=>{
  for(let f=0;f<=270;f++){
    const a=stateAt(demoScroll(f,layout)),b=stateAt(demoScroll(540-f,layout));
    assert.deepEqual(a.frame,b.frame);assert.deepEqual(a.state,b.state);
    for(const side of ['left','right'])assert.deepEqual(handAttachment(side,layout,a.state,a.poseAt),handAttachment(side,layout,b.state,b.poseAt));
  }
});

test('successive card regrips have no positional seam and both anatomical hand clips loop',()=>{
  for(let cycle=1;cycle<8;cycle++){
    const a=stateAt(layout.sectionStart+(2.6+cycle-1e-7)*layout.pitch),b=stateAt(layout.sectionStart+(2.6+cycle)*layout.pitch);
    for(const side of ['left','right']){
      const x=handAttachment(side,layout,a.state,a.poseAt),y=handAttachment(side,layout,b.state,b.poseAt);
      assert.ok(Math.hypot(x.x-y.x,x.y-y.y)<.001);
      const before=samplePad(motion,60,side),after=samplePad(motion,120,side);
      assert.ok(Math.max(...before.map((v,i)=>Math.abs(v-after[i])))<1e-5);
    }
  }
});
