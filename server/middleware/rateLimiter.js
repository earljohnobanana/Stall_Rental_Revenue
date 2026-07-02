const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a moment.' },
  skip: (req) => req.path === '/api/health',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
});

const exportLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Export limit reached. Please wait before generating another report.' },
});

module.exports = { apiLimiter, loginLimiter, exportLimiter };