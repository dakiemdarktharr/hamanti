import { MongoClient, Binary } from 'mongodb';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// Run with node --env-file=.env.local scripts/migrate-images.mjs.
// Original image bytes are retained. No transcoding or generated examples.
const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const content = JSON.parse(await read('data/references.json'));
const uri = process.env.MONGODB_URI;
if (!uri?.startsWith('mongodb')) throw new Error('Set MONGODB_URI in .env.local.');
const client = new MongoClient(uri, {maxPoolSize: 6, serverSelectionTimeoutMS: 15000});
const hash = value => createHash('sha256').update(value).digest('hex');
await mkdir(new URL('.image-cache/', root), {recursive: true});
let media = {};
try { media = JSON.parse(await read('data/media-map.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const palettes = {};
const imagePalettes = new Map();
const failures = [], jobs = new Map();
for (const [styleId, style] of Object.entries(content.styles)) {
  for (const example of style.examples) {
    const source = example.originalImage || example.image;
    if (!source.startsWith('https://')) continue;
    if (!jobs.has(source)) jobs.set(source, {url:source, styles:[]});
    jobs.get(source).styles.push(Number(styleId));
  }
}
const toHex = colors => '#' + colors.map(c=>Math.round(Math.max(0,Math.min(255,c))).toString(16).padStart(2,'0')).join('');
function paletteFromPixels(data) {
  const bins = new Map();
  for (let i=0;i<data.length;i+=3) {
    const rgb = [...data.slice(i,i+3)], max=Math.max(...rgb), min=Math.min(...rgb);
    if (max < 35 || min > 225 || max-min < 25) continue;
    const key=rgb.map(c=>Math.floor(c/40)).join(',');
    if (!bins.has(key)) bins.set(key,{count:0,sum:[0,0,0]});
    const bin=bins.get(key); bin.count++; rgb.forEach((c,k)=>bin.sum[k]+=c);
  }
  const winner=[...bins.values()].sort((a,b)=>b.count-a.count)[0];
  const rgb=winner?winner.sum.map(c=>c/winner.count):[150,157,141];
  return {background:toHex(rgb.map(c=>12+c*.055)),accent:toHex(rgb.map(c=>c*.65+255*.35))};
}
let done=0, bytes=0;
await client.connect();
const db = client.db('hamanti');
const images = db.collection('images');
try {
  const queue=[...jobs.values()];
  // Conservative ceiling inside the existing free cluster; never upgrades it.
  const stats = await db.command({dbStats:1});
  let totalSize=Number(stats.dataSize||0);
  async function worker() {
    while(queue.length) {
      const job=queue.shift(), key=hash(job.url), path=new URL(`.image-cache/${key}`,root);
      try {
        let buffer;
        try { buffer=await readFile(path); } catch(error) {
          if(error.code!=='ENOENT') throw error;
          const url=new URL(job.url);
          if(url.protocol!=='https:' || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) throw new Error('Unsupported image host');
          const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'hamanti-reference-archive/1.0'}});
          if(!response.ok) throw new Error(`Source HTTP ${response.status}`);
          if(!/^image\/(jpeg|png|webp|gif|avif)/i.test(response.headers.get('content-type')||'')) throw new Error('Source did not return a supported image');
          const reader=response.body.getReader(), chunks=[];
          let length=0;
          for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4_300_000){await reader.cancel();throw new Error('Source exceeds the delivery size limit');}chunks.push(value);}
          buffer=Buffer.concat(chunks);
          await writeFile(path,buffer);
        }
        const metadata=await sharp(buffer,{animated:false}).metadata();
        const mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',heif:'image/avif'}[metadata.format];
        if(!mime) throw new Error('Unsupported image format');
        const existing=await images.findOne({_id:key},{projection:{_id:1}});
        if(!existing){
          if(totalSize+buffer.length>280_000_000) throw new Error('Archive capacity safeguard reached');
          totalSize+=buffer.length;
          await images.insertOne({_id:key,data:new Binary(buffer),mime,size:buffer.length,width:metadata.width,height:metadata.height,sourceUrl:job.url,checksum:hash(buffer),createdAt:new Date()});
        }
        const raw=await sharp(buffer).resize(40,40,{fit:'inside'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
        const palette=paletteFromPixels(raw);
        imagePalettes.set(job.url, palette);
        media[job.url]={id:key,size:buffer.length,width:metadata.width,height:metadata.height,mime};
        bytes+=buffer.length;
      } catch(error) {
        failures.push({url:job.url,styles:job.styles,reason:/Source|Unsupported|Archive/.test(error.message)?error.message:error.name});
      }
      done++;
      if(done%100===0) {
        console.log(`${done}/${jobs.size} images processed; ${failures.length} unavailable.`);
        await writeFile(new URL('data/media-map.json',root),JSON.stringify(media));
      }
    }
  }
  await Promise.all(Array.from({length:5},worker));
  // Choose the first available reference in source order, independent of download timing.
  for (const [id, style] of Object.entries(content.styles)) {
    const source = style.examples.map(example => example.originalImage || example.image).find(url => imagePalettes.has(url));
    if (source) palettes[id] = {...imagePalettes.get(source), sourceImage:source, method:'dominant chromatic bucket'};
  }
  await db.collection('references').bulkWrite(Object.entries(content.styles).map(([id,style])=>({
    updateOne:{filter:{_id:Number(id)},update:{$set:{name:style.name,examples:style.examples.map(example=>({...example,imageId:media[example.originalImage||example.image]?.id||null})),updatedAt:new Date()}},upsert:true},
  })));
  await writeFile(new URL('data/media-map.json',root),JSON.stringify(media));
  await writeFile(new URL('data/palettes.json',root),JSON.stringify(palettes,null,2));
  await writeFile(new URL('data/migration-report.json',root),JSON.stringify({processed:done,stored:Object.keys(media).length,bytes,failures,completedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({processed:done,stored:Object.keys(media).length,megabytes:Math.round(bytes/1e6),unavailable:failures.length}));
} finally {await client.close();}
