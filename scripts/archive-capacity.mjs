import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const list = await client.db('admin').admin().listDatabases({ nameOnly: true });
  const databases = [];
  for (const { name } of list.databases) {
    if (['admin', 'local', 'config'].includes(name)) continue;
    const stats = await client.db(name).command({ dbStats: 1 });
    databases.push({ name, dataBytes: stats.dataSize, storageBytes: stats.storageSize, indexBytes: stats.indexSize });
  }
  console.log(JSON.stringify({ databases, combinedDataAndIndexes: databases.reduce((n, d) => n + d.dataBytes + d.indexBytes, 0) }, null, 2));
} catch (error) {
  console.error(`Capacity read unavailable: ${error.name}`);
  process.exitCode = 1;
} finally { await client.close(); }
