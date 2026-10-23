// Explicit, repeatable partial import. Never deletes or modifies intake files.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient, Binary } from 'mongodb';
import sharp from 'sharp';
import { compileCatalog, isFullHD, hasPeopleReview } from './compile-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await fs.readFile(new URL(name, root), 'utf8'));
const save = (name, value) => fs.writeFile(new URL(name, root), JSON.stringify(value, null, 2) + '\n');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const policy = await read('data/collection-policy.json');
if (policy.mode !== 'manual') throw new Error('Manual collection mode is required.');
const intake = await read('data/manual-intake.json');
const review = await read('data/manual-review.json');
const media = await read('data/manual-media-map.json');
const selection = await read('data/manual-selection.json');
const base = await fs.realpath(intake.directory);
const uri = process.env.MONGODB_URI;
if (!uri?.startsWith('mongodb')) throw new Error('MONGODB_URI is required.');
const client = new MongoClient(uri, {maxPoolSize:3,serverSelectionTimeoutMS:15000});
const report = {date:new Date().toISOString(),mode:'partial',approved:review.approved.length,
  published:0,storedDocuments:0,reusedDocuments:0,bytesAdded:0,failures:[],intakePreserved:true};
try {
  await client.connect();
  const db = client.db('hamanti'), images = db.collection('images');
  let totalBytes = Number((await db.command({dbStats:1})).dataSize);
  async function store(bytes, id, dimensions, mime, original, archiveOnly = false) {
    const checksum = hash(bytes);
    if (bytes.length > (archiveOnly ? 15000000 : 4300000)) throw new Error('Delivery size limit');
    const existing = await images.findOne({_id:id}, {projection:{_id:1}});
    if (!existing) {
      if (totalBytes + bytes.length > 4000e6) throw new Error('Storage capacity limit');
      await images.insertOne({_id:id,data:new Binary(bytes),mime,size:bytes.length,
        width:dimensions.width,height:dimensions.height,checksum,collectionVersion:4,
        variant:archiveOnly?'source-original':original?'original':'thumbnail',nativeFullHD:original && isFullHD(dimensions),intakeVerified:true,createdAt:new Date()});
      totalBytes += bytes.length; report.bytesAdded += bytes.length; report.storedDocuments++;
    } else report.reusedDocuments++;
    const stored = await images.findOne({_id:id});
    const returned = Buffer.from(stored.data.buffer);
    const measured = await sharp(returned).metadata();
    if (hash(returned) !== checksum || stored.size !== bytes.length ||
        measured.width !== dimensions.width || measured.height !== dimensions.height)
      throw new Error('Stored image verification failed');
    return {id,width:dimensions.width,height:dimensions.height,size:bytes.length,mime,checksum,verified:true};
  }
  for (const item of review.approved) {
    try {
      if (!hasPeopleReview(item) || !intake.folders.some(s=>s.name===item.style && s.folder===item.folder))
        throw new Error('Review or style mapping missing');
      const file = await fs.realpath(path.resolve(base,item.folder,item.file));
      if (!file.toLowerCase().startsWith((base+path.sep).toLowerCase())) throw new Error('Invalid intake path');
      const original = await fs.readFile(file);
      if (hash(original) !== item.checksum) throw new Error('Source changed after review');
      const meta = await sharp(original).metadata();
      if (!policy.allowFolderOriginals && !isFullHD(meta)) throw new Error('Below native Full HD');
      const mime = {jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'}[meta.format];
      if (!mime) throw new Error('Unsupported image format');
      const archiveOnly = original.length > 4300000;
      const archived = await store(original,hash(`manual-original-v1:${item.checksum}`),meta,mime,true,archiveOnly);
      // Preserve source bytes and native dimensions; use lossless encoding for oversized PNG delivery.
      const stored = archiveOnly
        ? await store(await sharp(original).webp({lossless:true}).toBuffer(),hash(`manual-lossless-v1:${item.checksum}`),meta,'image/webp',true)
        : archived;
      const thumbnail = await sharp(original).rotate().resize(640,800,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
      const thumb = await store(thumbnail,hash(`manual-thumb-v1:${item.checksum}`),await sharp(thumbnail).metadata(),'image/webp',false);
      const {dominant} = await sharp(original).resize(48,48,{fit:'inside'}).stats();
      const rgb = [dominant.r,dominant.g,dominant.b];
      const hex = values => '#' + values.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
      const imageUrl = `manual:${item.checksum}`;
      media[imageUrl] = {...stored,intakeVerified:true,thumbnailId:thumb.id,sourceChecksum:item.checksum,sourceOriginalId:archived.id,
        palette:{background:hex(rgb.map(v=>12+v*.055)),accent:hex(rgb.map(v=>v*.65+255*.35)),method:'dominant color of selected reference'}};
      const entries = selection[item.style] ||= [];
      const entry = {imageUrl,title:item.title,url:item.url || null,width:meta.width,height:meta.height,
        reviewStatus:'approved',intakeVerified:true,peopleReview:item.peopleReview,provider:item.provider || 'User-supplied collection',
        ...(item.sourceUrl ? {sourceUrl:item.sourceUrl} : {}),collectedAt:report.date};
      const previous = entries.findIndex(e=>e.imageUrl===imageUrl);
      if (previous>=0) entries[previous]=entry; else entries.push(entry);
      report.published++;
    } catch (error) {
      const known = /^(Delivery|Storage|Stored|Review|Invalid|Source changed|Below native|Unsupported)/.test(error.message);
      report.failures.push({style:item.style,file:item.file,reason:known?error.message:error.name});
    }
  }
  await save('data/manual-media-map.json',media);
  await save('data/manual-selection.json',selection);
  const compiled = await compileCatalog();
  const catalog = await read('data/catalog.json');
  await db.collection('references_v3').bulkWrite(catalog.styles.map(style=>({
    updateOne:{filter:{_id:style.id},update:{$set:{...style,...compiled.styles[style.id],updatedAt:new Date()}},upsert:true},
  })));
  await save('data/manual-import-report.json',report);
  console.log(JSON.stringify(report,null,2));
  if (report.failures.length) process.exitCode = 1;
} catch (error) {
  console.error(`Manual import could not finish: ${error.name}`);
  process.exitCode = 1;
} finally { await client.close(); }
