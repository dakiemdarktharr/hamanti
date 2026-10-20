// Copy only hamanti's existing archive to the replacement cluster. Never delete
// source data or read another application's collections.
import { MongoClient } from 'mongodb';
import { parseEnv } from 'node:util';
import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const sourceURI = parseEnv(await fs.readFile(new URL('.env.cluster0.local', root), 'utf8')).MONGODB_URI;
const targetURI = process.env.MONGODB_URI;
if (!sourceURI || !targetURI || sourceURI === targetURI) throw new Error('Distinct source and target connections are required.');
const source = new MongoClient(sourceURI, { maxPoolSize: 2, serverSelectionTimeoutMS: 15000 });
const target = new MongoClient(targetURI, { maxPoolSize: 2, serverSelectionTimeoutMS: 15000 });
try {
  await source.connect();
  await target.connect();
  const sourceDB = source.db('hamanti'), targetDB = target.db('hamanti');
  const existing = new Set((await targetDB.collection('images').find({}, { projection: { _id: 1 } }).toArray()).map(doc => doc._id));
  let copied = 0, bytes = 0, batch = [];
  const flush = async () => {
    if (!batch.length) return;
    await targetDB.collection('images').bulkWrite(batch, { ordered: false });
    copied += batch.length; batch = [];
    if (copied % 200 === 0) console.log(`Copied ${copied} legacy files.`);
  };
  for await (const document of sourceDB.collection('images').find().batchSize(8)) {
    if (existing.has(document._id)) continue;
    bytes += document.size || 0;
    if (bytes > 1000000000) throw new Error('Unexpected legacy archive size.');
    batch.push({ updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true } });
    if (batch.length === 8) await flush();
  }
  await flush();
  const legacy = await sourceDB.collection('references').find().toArray();
  if (legacy.length) await targetDB.collection('references_legacy').bulkWrite(legacy.map(doc => ({
    updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true },
  })));
  const report = { copied, bytes, legacyStyleRecords: legacy.length, sourcePreserved: true, completedAt: new Date().toISOString() };
  await fs.writeFile(new URL('data/archive-copy-report.json', root), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(`Archive copy could not finish: ${error.name}`);
  process.exitCode = 1;
} finally { await source.close(); await target.close(); }
