import fs from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {MongoClient} from 'mongodb';

// Explicitly invoked one-time removal requested on 2026-10-20.
// Only hamanti's image collection and reference-image fields are touched.
if (!process.argv.includes('--delete-hamanti-reference-images')) throw new Error('Explicit deletion flag required.');
const root = new URL('../',import.meta.url);
const policy = JSON.parse(await fs.readFile(new URL('data/collection-policy.json',root),'utf8'));
if (policy.mode !== 'manual') throw new Error('Switch the catalog to manual images before clearing its archive.');
const retired = new Set();
for (const name of ['data/media-map.json','data/hd-media-map.json']) {
  const map = JSON.parse(await fs.readFile(new URL(name,root),'utf8'));
  for (const item of Object.values(map)) if (/^[a-f0-9]{64}$/.test(item.id)) retired.add(item.id);
}
const report = {date:new Date().toISOString(), databases:[], complete:false};
try {
  for (const [label,filename] of [['active','.env.local'],['legacy','.env.cluster0.local']]) {
    const env = parseEnv(await fs.readFile(new URL(filename,root),'utf8'));
    if (!env.MONGODB_URI?.startsWith('mongodb')) throw new Error('Missing archive connection.');
    const client = new MongoClient(env.MONGODB_URI,{maxPoolSize:2,serverSelectionTimeoutMS:15000});
    try {
      await client.connect();
      const db = client.db('hamanti');
      const images = db.collection('images');
      const ids = await images.find({},{projection:{_id:1}}).toArray();
      for (const {_id} of ids) if (typeof _id === 'string' && /^[a-f0-9]{64}$/.test(_id)) retired.add(_id);
      await fs.writeFile(new URL('data/withdrawn-media.json',root),JSON.stringify([...retired]));
      const result = await images.deleteMany({});
      const collections = new Set((await db.listCollections({}, {nameOnly:true}).toArray()).map(c=>c.name));
      for (const name of ['references','references_v3','references_legacy']) {
        if (collections.has(name)) await db.collection(name).updateMany({},{$set:{examples:[],images:[]},$unset:{palette:''}});
      }
      const remaining = await images.countDocuments({});
      if (remaining) throw new Error('Image archive is not empty.');
      report.databases.push({archive:label,database:'hamanti',deleted:result.deletedCount,remaining});
      await fs.writeFile(new URL('data/reference-removal-report.json',root),JSON.stringify(report,null,2)+'\n');
    } finally { await client.close(); }
  }
  report.complete = true;
  await fs.writeFile(new URL('data/reference-removal-report.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} catch (error) {
  console.error(`Reference removal stopped: ${error.name}. Completed archives are recorded in data/reference-removal-report.json.`);
  process.exitCode=1;
}
