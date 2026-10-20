import { getDatabase } from '../../lib/database.js';
import withdrawnMedia from '../../data/withdrawn-media.json' with {type:'json'};

const withdrawn = new Set(withdrawnMedia);

export default async function image(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).end();
  }
  const id = String(request.query.id || '');
  if (!/^[a-f0-9]{64}$/.test(id)) return response.status(404).end();
  if (withdrawn.has(id)) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(410).end('Reference removed.');
  }
  try {
    const db = await getDatabase();
    const document = await db.collection('images').findOne({_id: id}, {
      projection: {data: 1, mime: 1, size: 1},
    });
    if (!document) return response.status(404).end();
    response.setHeader('Content-Type', document.mime);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('ETag', `"${id}"`);
    if (request.headers['if-none-match'] === `"${id}"`) return response.status(304).end();
    response.setHeader('Content-Length', document.size);
    return response.status(200).end(request.method === 'HEAD' ? undefined : Buffer.from(document.data.buffer));
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(503).end('Image temporarily unavailable.');
  }
}
