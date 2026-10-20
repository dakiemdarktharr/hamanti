// Pigment lives in model space, so the marks follow the creatures and foliage.
// No image textures or per-frame noise: movement comes from the woodland itself.
export function applyPastelMaterials(models) {
  const colors = {
    moss: '#789a83', sage: '#a6b99a', leaf: '#c7cd9f', bark: '#a79188',
    clay: '#d6a18c', cream: '#f0e0bf', ink: '#53666d', stone: '#a7adb9',
    soil: '#bca28c', 'earth-edge': '#a48c77', trail: '#ddc7a6',
    'cloud-light': '#f1eee6', 'cloud-shadow': '#d4d7e1',
  };
  const materials = new Map();
  for (const [kind, model] of Object.entries(models)) {
    model.traverse(part => {
      if (!part.isMesh) return;
      // Terrain caps and edges use a material array.
      if (Array.isArray(part.material)) {
        part.material = part.material.map(material => {
          const proxy = {isMesh:true, material};
          applyPastelMaterials({[kind]:{traverse:visit=>visit(proxy)}});
          return proxy.material;
        });
        return;
      }
      const original = part.material;
      const key = `${kind}:${original.uuid}`;
      if (!materials.has(key)) {
        const material = original.clone();
        material.color.set(colors[original.name] || '#a6b99a');
        if (kind === 'cloud') material.color.set('#e2e4ed');
        if (kind === 'bird') material.color.set(original.name === 'ink' ? '#7f8fa5' : '#b3a9c6');
        if (kind === 'butterfly' && original.name === 'leaf') material.color.set('#e3c68e');
        material.roughness = 1;
        material.metalness = 0;
        if (kind === 'sky') {
          material.emissive.copy(material.color);
          material.emissiveIntensity = .2;
        }
        material.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vPigmentPosition;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPigmentPosition = position;');
          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
            varying vec3 vPigmentPosition;
            float pigmentHash(vec3 p) {
              p = fract(p * .3183099 + vec3(.13, .27, .41));
              p *= 17.;
              return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float pigmentNoise(vec3 p) {
              vec3 i = floor(p), f = fract(p);
              f = f * f * (3. - 2. * f);
              return mix(
                mix(mix(pigmentHash(i), pigmentHash(i + vec3(1,0,0)), f.x),
                    mix(pigmentHash(i + vec3(0,1,0)), pigmentHash(i + vec3(1,1,0)), f.x), f.y),
                mix(mix(pigmentHash(i + vec3(0,0,1)), pigmentHash(i + vec3(1,0,1)), f.x),
                    mix(pigmentHash(i + vec3(0,1,1)), pigmentHash(i + vec3(1,1,1)), f.x), f.y), f.z);
            }`);
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            vec3 p = vPigmentPosition;
            float daub = pigmentNoise(p * vec3(5., 3., 5.));
            float bristle = pigmentNoise(p * vec3(54., 5., 41.));
            float tooth = pigmentHash(floor(p * 180.));
            float dry = smoothstep(.6, .88, bristle + (tooth - .5) * .25);
            diffuseColor.rgb *= ${kind === 'sky' ? '.94 + daub * .08 + bristle * .03' : '.77 + daub * .32 + bristle * .18'};
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.88, .85, .76), dry * ${kind === 'sky' ? '.06' : '.32'});
          `);
        };
        material.customProgramCacheKey = () => `hamanti-pastel-v2-${kind === 'sky' ? 'sky' : 'ground'}`;
        materials.set(key, material);
      }
      part.material = materials.get(key);
    });
  }
}
