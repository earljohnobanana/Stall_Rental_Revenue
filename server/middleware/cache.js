const store = new Map();

const cacheMiddleware = (ttlSeconds = 30, keyPrefix = '') => (req, res, next) => {
  if (req.method !== 'GET') return next();
  const key = `${keyPrefix}:${req.originalUrl}`;
  const cached = store.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.data);
  }
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode === 200) store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
    res.setHeader('X-Cache', 'MISS');
    return originalJson(data);
  };
  next();
};

const bustCache = (keyPrefix) => {
  for (const key of store.keys()) { if (key.startsWith(keyPrefix)) store.delete(key); }
};

const bustCacheOn = (keyPrefix) => (req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) bustCache(keyPrefix);
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) { if (now >= val.expiresAt) store.delete(key); }
}, 60 * 1000);

module.exports = { cacheMiddleware, bustCache, bustCacheOn };