import { MongoClient } from 'mongodb';

let connection;
export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Database connection is not configured.');
  if (!connection) {
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    connection = client.connect().catch(error => { connection = null; throw error; });
  }
  return (await connection).db('hamanti');
}
