import * as THREE from 'three';

const materials = {
  soil: new THREE.MeshStandardMaterial({name:'soil', color:'#bca28c', roughness:1}),
  edge: new THREE.MeshStandardMaterial({name:'earth-edge', color:'#a48c77', roughness:1}),
  trail: new THREE.MeshStandardMaterial({name:'trail', color:'#ddc7a6', roughness:1}),
  grass: new THREE.MeshStandardMaterial({name:'sage', color:'#a6b99a', roughness:1}),
};

function ribbon(points, width) {
  const positions = [], indices = [];
  points.forEach(([x,y,z], i) => {
    const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
    const dx = after[0] - before[0], dz = after[2] - before[2], length = Math.hypot(dx,dz) || 1;
    positions.push(x - dz / length * width, y, z + dx / length * width,
      x + dz / length * width, y, z - dx / length * width);
    if (i) indices.push(i*2-2,i*2,i*2-1, i*2-1,i*2,i*2+1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function createGround(random, radius = 1.5) {
  const group = new THREE.Group(), shape = new THREE.Shape();
  const depth = radius * (.6 + random() * .25);
  const phase = random() * Math.PI * 2;
  for (let i = 0; i <= 32; i++) {
    const a = i / 32 * Math.PI * 2;
    const irregular = 1 + Math.sin(a * 3 + phase) * .11 + Math.cos(a * 5 - phase) * .06;
    const x = Math.cos(a) * radius * irregular, z = Math.sin(a) * depth * irregular;
    if (i) shape.lineTo(x,z); else shape.moveTo(x,z);
  }
  const geometry = new THREE.ExtrudeGeometry(shape,{depth:.16, bevelEnabled:false, steps:1});
  geometry.rotateX(-Math.PI/2); geometry.translate(0,-.15,0);
  group.add(new THREE.Mesh(geometry, [materials.soil,materials.edge]));
  const points = Array.from({length:25}, (_,i)=>{
    const t = i / 24, x = (t * 2 - 1) * radius * .9;
    return [x,.02,Math.sin(t * Math.PI * 1.6 + phase) * depth * .35 + depth * .25];
  });
  group.add(new THREE.Mesh(ribbon(points,.10 + random() * .07),materials.trail));
  // Grass sits on the soil rather than hovering beside its plant.
  for (let i=0;i<3;i++) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(1,7,4),materials.grass);
    tuft.scale.set(.22 + random()*.2,.06,.18 + random()*.15);
    tuft.position.set((random()-.5)*radius*1.1,.025,-depth*(.3+random()*.3));
    group.add(tuft);
  }
  return group;
}

export const pathDepth = x => 1 + Math.sin(x * .3) * .38;
export function createCrossingPath() {
  const group = new THREE.Group();
  const points = Array.from({length:65},(_,i)=>{
    const x = -16 + i*.5;
    return [x,0,pathDepth(x)];
  });
  group.add(new THREE.Mesh(ribbon(points,.40),materials.soil));
  group.add(new THREE.Mesh(ribbon(points.map(([x,y,z])=>[x,y+.012,z]),.19),materials.trail));
  return group;
}

const puffGeometry = new THREE.SphereGeometry(1,16,12);
export function createCloud(random) {
  const cloud = new THREE.Group();
  const light = new THREE.MeshStandardMaterial({name:'cloud-light', color:'#f1eee6',roughness:1});
  const shade = new THREE.MeshStandardMaterial({name:'cloud-shadow',color:'#d4d7e1',roughness:1});
  const width = 1.6 + random() * 2.7, height = .3 + random() * .65;
  const count = 7 + Math.floor(random() * 6);
  for (let i=0;i<count;i++) {
    const t = i/(count-1), mound = Math.sin(t*Math.PI);
    const puff = new THREE.Mesh(puffGeometry,i%4===0?shade:light);
    const r = .3 + random()*.35 + mound*.2;
    puff.scale.set(r*(.8+random()*.5),r*(.6+random()*.55)*height,r*(.55+random()*.4));
    puff.position.set((t-.5)*width,(mound*.4+random()*.2)*height,(random()-.5)*.45);
    cloud.add(puff);
  }
  const base = new THREE.Mesh(puffGeometry,shade);
  base.scale.set(width*.48,.11+random()*.06,.36);
  base.position.y = -.06; cloud.add(base);
  cloud.scale.setScalar(.55+random()*.7);
  return cloud;
}
