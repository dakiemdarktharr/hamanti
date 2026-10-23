import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { handFrame, handAttachment, demoScroll, samplePad } from './hand-motion.js';
import { cardSurfacePoint } from './card-surface.js';

const vertexShader=`
  #include <common>
  #include <skinning_pars_vertex>
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  uniform float outlineWidth;
  void main(){
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    vec3 transformed=position+normal*outlineWidth;
    #include <skinning_vertex>
    vec4 world=modelMatrix*vec4(transformed,1.0);
    vWorldPosition=world.xyz;
    vWorldNormal=normalize(mat3(modelMatrix)*objectNormal);
    gl_Position=projectionMatrix*viewMatrix*world;
  }
`;
const fragmentShader=`
  #include <common>
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  uniform vec3 colors[4];
  uniform float cel;
  void main(){
    // Render the complete anatomical surface in both passes. Invisible card
    // meshes write foreground depth; no bone-weight threshold cuts the skin.
    float light=dot(normalize(vWorldNormal),normalize(vec3(-.35,.87,.35)));
    vec3 color=colors[0];
    if(cel>.5){
      if(light>=.78)color=colors[3];
      else if(light>=.46)color=colors[2];
      else if(light>=.12)color=colors[1];
    }
    gl_FragColor=vec4(color,1.0);
    #include <colorspace_fragment>
  }
`;
const colors={skin:['#573a39','#b76552','#e89c77','#ffd3a1'],cloth:['#777b88','#b4bac5','#e5e5e2','#fffdf5']};

export async function createHandPreview({journey,getLayout,setScroll,requestUpdate,review=false}) {
  const status=document.createElement('div');status.className='hand-review';status.setAttribute('aria-label','Hand motion review');
  status.innerHTML=`<span class="hand-review-status" role="status">Loading hands…</span><button type="button" data-play>Play demo</button><button type="button" data-back aria-label="Previous frame">−1</button><label><span class="sr-only">Review animation frame</span><input type="range" min="0" max="540" step="1" value="0"></label><button type="button" data-next aria-label="Next frame">+1</button><output>000 / 540</output>`;
  if(review)document.body.append(status);
  const label=status.querySelector('[role=status]'),range=status.querySelector('input'),output=status.querySelector('output'),play=status.querySelector('[data-play]');
  const [motion,gltf]=await Promise.all([
    fetch('./hands/hand-motion.json').then(r=>{if(!r.ok)throw Error('Hand keyframes unavailable');return r.json();}),
    new GLTFLoader().loadAsync('./hands/hands-only.glb'),
  ]);
  const scene=new THREE.Scene();scene.add(gltf.scene);
  // Separate nonanimated parent transforms let the HANDS follow the original
  // HTML fan. Nothing in this renderer writes a card or deck transform.
  const attachments={};
  for(const side of ['left','right']){
    const rig=gltf.scene.getObjectByName(side==='left'?'Left_Hand':'Right_Hand');
    if(!rig)throw Error(`Missing ${side} hand rig`);
    const group=new THREE.Group();group.name=`${side}_card_attachment`;
    rig.parent.add(group);group.add(rig);attachments[side]=group;
  }
  const mixer=new THREE.AnimationMixer(gltf.scene);
  for(const clip of gltf.animations){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}
  const materials=[];
  function material(source,mesh,outline=false){
    const type=source.userData.handShader || (/skin/i.test(source.name)?'skin':/cotton/i.test(source.name)?'cloth':'flat');
    const flatColor=source.userData.handColor
      ? new THREE.Color(...source.userData.handColor)
      : new THREE.Color(/fine.contour/i.test(source.name)?'#9b6558':/nail/i.test(source.name)?'#f3c2ae':'#27252b');
    const palette=outline ? [new THREE.Color('#27252b')]
      : colors[type]?.map(c=>new THREE.Color(c)) || [flatColor];
    while(palette.length<4)palette.push(palette[0]);
    const mat=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{
      colors:{value:palette},cel:{value:!outline&&colors[type]?1:0},
      outlineWidth:{value:outline?.14:0},
    },side:outline?THREE.BackSide:THREE.DoubleSide});
    materials.push(mat);return mat;
  }
  const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const mesh of meshes){
    const original=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    mesh.material=original.map(m=>material(m,mesh));if(mesh.material.length===1)mesh.material=mesh.material[0];
    mesh.frustumCulled=false;
    if(!mesh.name.includes('nail')){
      const ink=mesh.clone();ink.name=mesh.name+'_ink';ink.material=original.map(m=>material(m,mesh,true));if(ink.material.length===1)ink.material=ink.material[0];
      if(mesh.isSkinnedMesh)ink.bind(mesh.skeleton,mesh.bindMatrix);
      mesh.parent.add(ink);ink.frustumCulled=false;
    }
  }
  const renderers=[-1,1].map(layer=>{
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.autoClear=false;
    renderer.domElement.className=`hand-layer hand-layer-${layer<0?'back':'front'}`;
    renderer.domElement.setAttribute('aria-hidden','true');journey.append(renderer.domElement);
    return {renderer,layer};
  });
  const camera=new THREE.OrthographicCamera(-21,21,14,-14,.1,200);
  const baseTarget=new THREE.Vector3(0,1,2),eyeDelta=new THREE.Vector3(0,74,10);
  camera.position.copy(baseTarget).add(eyeDelta);camera.lookAt(baseTarget);camera.updateMatrixWorld();
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const left=samplePad(motion,60,'left'),right=samplePad(motion,60,'right');
  const pad=new THREE.Vector3(...left).add(new THREE.Vector3(...right)).multiplyScalar(.5);
  const cardScene=new THREE.Scene(),cardMasks=[];
  const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,depthTest:true,side:THREE.DoubleSide});
  const rayDirection=eyeDelta.clone().normalize().negate();
  let cardSize='',surfaceError=0;
  function syncCardMasks(layout,frame,poseAt,state,canvasHeight){
    const dimensions=`${layout.cardWidth}/${layout.cardHeight}`;
    if(dimensions!==cardSize){
      cardSize=dimensions;
      for(const mask of cardMasks){mask.geometry.dispose();cardScene.remove(mask);}cardMasks.length=0;
      const w=layout.cardWidth/2,h=layout.cardHeight/2,r=Math.min(12,w,h),shape=new THREE.Shape();
      shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);
      shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);
      shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
      const template=new THREE.ShapeGeometry(shape,6);
      for(let i=0;i<12;i++){
        const geometry=template.clone(),mask=new THREE.Mesh(geometry,depthMaterial);
        mask.userData.local=Float32Array.from(geometry.attributes.position.array);
        mask.frustumCulled=false;cardMasks.push(mask);cardScene.add(mask);
      }
      template.dispose();
    }
    const reach=Math.max(1,(layout.slots-1)/2)+2;
    const first=Math.max(0,Math.floor(frame.centre-reach)),last=Math.min(layout.count-1,Math.ceil(frame.centre+reach));
    const p=new THREE.Vector3(),check=new THREE.Vector3();surfaceError=0;
    cardMasks.forEach((mask,i)=>{
      const index=first+i;mask.visible=index<=last;if(!mask.visible)return;
      const pose=poseAt(index);mask.visible=pose.opacity>.001;if(!mask.visible)return;
      mask.userData.opacity=pose.opacity;
      const attr=mask.geometry.attributes.position,local=mask.userData.local;
      for(let j=0;j<attr.count;j++){
        const point=cardSurfacePoint(local[j*3],local[j*3+1],pose,layout);
        p.set(point.x/innerWidth*2-1,1-point.y/canvasHeight*2,0).unproject(camera);
        // Preserve CSS screen coordinates while assigning true camera depth.
        // Higher DOM order is nearer; rotateY tilts the entire card surface.
        const y=state.plane+(pose.order-30)*.002+point.depth/state.scale*(-rayDirection.y);
        p.addScaledVector(rayDirection,(y-p.y)/rayDirection.y);
        attr.setXYZ(j,p.x,p.y,p.z);
        check.copy(p).project(camera);
        surfaceError=Math.max(surfaceError,Math.hypot((check.x+1)*innerWidth/2-point.x,(1-check.y)*canvasHeight/2-point.y));
      }
      attr.needsUpdate=true;
    });
  }
  let size='',lastFrame=-1,playing=false,playStart=0,raf=0,reviewFrame=0,followingScroll=true,lastScroll=null,direction=1;
  function update(layout,scroll,frame,poseAt){
    status.hidden=!review||Math.abs(frame.origin)>innerWidth*.5||layout.count===0;
    if(followingScroll&&lastScroll!==null&&Math.abs(scroll-lastScroll)>.01)direction=scroll>lastScroll?1:-1;
    if(!followingScroll)direction=reviewFrame>270?-1:1;
    lastScroll=scroll;
    // Use the actual native coordinate that the original card controller used.
    // Pixel rounding, spring response and deck curls all remain authoritative.
    const state=handFrame(layout,frame,motion);
    // Let sleeves reach the viewport edge instead of ending at the journey's
    // bottom padding. This changes only transparent canvas coverage.
    const canvasHeight=Math.max(layout.journeyHeight,innerHeight-journey.getBoundingClientRect().top);
    const key=`${innerWidth}/${canvasHeight}/${layout.journeyHeight}/${state.scale}`;
    if(key!==size){
      size=key;
      for(const {renderer} of renderers){renderer.setSize(innerWidth,canvasHeight,false);renderer.domElement.style.height=`${canvasHeight}px`;}
      camera.left=-innerWidth/(2*state.scale);camera.right=-camera.left;
      camera.top=canvasHeight/(2*state.scale);camera.bottom=-camera.top;
      const shift=(state.thumbY-canvasHeight/2)/state.scale+pad.clone().sub(baseTarget).dot(up);
      const target=baseTarget.clone().addScaledVector(up,shift);
      camera.position.copy(target).add(eyeDelta);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    }
    mixer.setTime(state.sourceFrame/60);
    const contacts={};
    for(const side of ['left','right']){
      const contact=handAttachment(side,layout,state,poseAt);
      const p=samplePad(motion,state.sourceFrame,side),grip=side==='left'?left:right;
      const projected=new THREE.Vector3(...p).project(camera);
      const natural={x:(projected.x+1)*innerWidth/2,y:(1-projected.y)*canvasHeight/2};
      // While released, retain a little of the source pad's withdrawal. While
      // pressed, the pad follows the same material point as the existing card.
      const x=contact.x+contact.lift*(p[0]-grip[0])*state.scale*.35;
      const y=contact.y-contact.lift*((p[1]-grip[1])*up.y+(p[2]-grip[2])*up.z)*state.scale*.35;
      // Orthographic inverse projection in the card plane: +X is screen right;
      // +Z projects down. Do not change Y, which preserves anatomical depth.
      attachments[side].position.set((x-natural.x)/state.scale,0,-(y-natural.y)/(up.z*state.scale));
      contacts[side]={...contact,padX:x,padY:y};
    }
    gltf.scene.updateMatrixWorld(true);
    syncCardMasks(layout,frame,poseAt,state,canvasHeight);
    for(const {renderer,layer} of renderers){
      renderer.domElement.style.transform=`translateX(${scroll-layout.start}px)`;
      renderer.domElement.style.opacity=String(Math.min(1,state.reach*4));
      renderer.clear();
      if(layer>0)renderer.render(cardScene,camera);
      renderer.render(scene,camera);
    }
    if(!playing&&followingScroll){
      // Invert the review's eased forward scroll for a useful scrubber value.
      const fraction=Math.max(0,Math.min(1,(state.opening*2.6+state.progress)/(2.6+Math.min(6,Math.max(0,layout.count-layout.slots)))));
      let lo=0,hi=1;for(let i=0;i<16;i++){const t=(lo+hi)/2;if(t*t*(3-2*t)<fraction)lo=t;else hi=t;}
      reviewFrame=Math.round((lo+hi)/2*270);range.value=String(reviewFrame);
    }
    output.value=`${String(Math.round(reviewFrame)).padStart(3,'0')} / 540`;
    label.textContent=state.opening<1?(state.reach<1?'Hands rise to the stack':'Spread five cards'):state.sourceFrame<86
      ? direction>0?'Right pushes · left lifts':'Right pulls · left lifts'
      : state.sourceFrame<93?'Exchange pressure'
      : direction>0?'Left pulls · right lifts':'Left pushes · right lifts';
    lastFrame=state.sourceFrame;
    journey.dataset.handFrame=state.sourceFrame.toFixed(4);
    journey.dataset.cardOffset=state.progress.toFixed(6);
    api.contacts=contacts;
    api.state=state;
    api.surfaceError=surfaceError;
  }
  function stop(){playing=false;cancelAnimationFrame(raf);play.textContent='Play demo';}
  function seek(frame){
    followingScroll=false;
    reviewFrame=Math.max(0,Math.min(540,frame));range.value=String(reviewFrame);
    const layout=getLayout();if(layout)setScroll(demoScroll(reviewFrame,layout));requestUpdate();
  }
  range.addEventListener('input',()=>{stop();seek(+range.value);});
  status.querySelector('[data-back]').addEventListener('click',()=>{stop();seek(Math.round(reviewFrame)-1);});
  status.querySelector('[data-next]').addEventListener('click',()=>{stop();seek(Math.round(reviewFrame)+1);});
  play.addEventListener('click',()=>{
    if(playing){stop();return;}
    playing=true;playStart=performance.now();play.textContent='Pause';
    const tick=now=>{if(!playing)return;seek(Math.min(540,(now-playStart)/1000*60));if(reviewFrame>=540){stop();return;}raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);
  });
  const manualScroll=()=>{stop();followingScroll=true;};
  document.querySelector('#home-page').addEventListener('wheel',manualScroll,{passive:true});
  document.querySelector('#home-page').addEventListener('touchstart',manualScroll,{passive:true});
  document.querySelector('#home-page').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.key))manualScroll();});
  label.textContent='Scroll to move the cards';
  function auditGrip(){
    // Audit evaluated, skinned vertices, not rest-pose bounding boxes. A
    // positive separating X interval proves the two hand meshes cannot cross.
    const bounds={};
    for(const side of ['left','right']){
      const box=new THREE.Box3(),point=new THREE.Vector3();
      attachments[side].traverse(mesh=>{
        if(!mesh.isMesh||mesh.name.endsWith('_ink'))return;
        const count=mesh.geometry.attributes.position.count;
        for(let i=0;i<count;i++){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);box.expandByPoint(point);}
      });
      bounds[side]={min:box.min.toArray(),max:box.max.toArray()};
    }
    return {handGap:bounds.right.min[0]-bounds.left.max[0],bounds,contacts:api.contacts};
  }
  let visibilityTarget;
  function auditVisibility(){
    // The foreground pass is also the visible hand silhouette: card depth
    // removes hidden parts while full geometry remains intact outside cards.
    // Flood from each actual nail centre to the sleeve at the viewport edge.
    // This catches the detached-thumb defect that 3D hand/hand bounds cannot.
    const renderer=renderers[1].renderer,w=Math.ceil(innerWidth/2),h=Math.ceil(parseFloat(renderer.domElement.style.height)/2);
    if(!visibilityTarget||visibilityTarget.width!==w||visibilityTarget.height!==h){visibilityTarget?.dispose();visibilityTarget=new THREE.WebGLRenderTarget(w,h);}
    renderer.setRenderTarget(visibilityTarget);renderer.clear();renderer.render(cardScene,camera);renderer.render(scene,camera);
    const pixels=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(visibilityTarget,0,0,w,h,pixels);renderer.setRenderTarget(null);
    // Translucent arriving cards still show the rear hand through the DOM.
    // Include that contribution rather than calling a faint overlay a cut.
    renderer.setRenderTarget(visibilityTarget);renderer.clear();renderer.render(scene,camera);
    const full=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(visibilityTarget,0,0,w,h,full);renderer.setRenderTarget(null);
    const coverage=new OffscreenCanvas(w,h),context=coverage.getContext('2d'),vertex=new THREE.Vector3();
    for(const mask of cardMasks){
      if(!mask.visible)continue;context.globalAlpha=mask.userData.opacity;context.beginPath();
      const attr=mask.geometry.attributes.position;
      for(let i=0;i<attr.count;i++){
        vertex.fromBufferAttribute(attr,i).project(camera);
        const x=(vertex.x+1)*w/2,y=(vertex.y+1)*h/2;
        if(i===0)context.moveTo(x,y);else context.lineTo(x,y);
      }
      context.closePath();context.fill();
    }
    const covered=context.getImageData(0,0,w,h).data;
    for(let i=3;i<pixels.length;i+=4){const front=pixels[i]/255;pixels[i]=255*(front+(1-front)*(full[i]/255)*(1-covered[i]/255));}
    const result={};
    for(const side of ['left','right']){
      const nail=meshes.find(m=>m.name.toLowerCase().startsWith(side)&&m.name.includes('nail'));
      const point=new THREE.Vector3(),centre=new THREE.Vector3();
      for(let i=0;i<nail.geometry.attributes.position.count;i++){nail.getVertexPosition(i,point);centre.add(point.applyMatrix4(nail.matrixWorld));}
      centre.divideScalar(nail.geometry.attributes.position.count).project(camera);
      const x=Math.round((centre.x+1)*w/2),y=Math.round((centre.y+1)*h/2);
      if(x<0||x>=w||y<0||y>=h){result[side]={visible:false,offscreen:true};continue;}
      const start=y*w+x,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0,sleeveEdge=false;
      if(pixels[start*4+3]>40){seen[start]=1;queue[tail++]=start;}
      while(head<tail){
        const at=queue[head++],px=at%w,py=Math.floor(at/w);
        // A narrow viewport crops the sleeve at the corresponding side edge.
        // Require that exit below the nail, so an upper fingertip cannot pass.
        if(py<=1||((side==='left'?px<=1:px>=w-2)&&py<y))sleeveEdge=true;
        for(const next of [px>0?at-1:-1,px<w-1?at+1:-1,py>0?at-w:-1,py<h-1?at+w:-1]){
          if(next>=0&&!seen[next]&&pixels[next*4+3]>40){seen[next]=1;queue[tail++]=next;}
        }
      }
      result[side]={visible:tail>0,connectedToSleeve:sleeveEdge,area:tail};
    }
    return result;
  }
  const api={motion,update,seek,stop,auditGrip,auditVisibility,
    get frame(){return lastFrame;},get ready(){return true;}};
  // Deliberate preview-only inspection surface for frame-by-frame review.
  if(review)window.handMotionPreview=api;
  requestUpdate();return api;
}
