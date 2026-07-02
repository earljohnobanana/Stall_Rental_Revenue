require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const session    = require('express-session');
const path       = require('path');
const fs         = require('fs');

// Optional packages
let helmet, compression, morgan;
try { helmet      = require('helmet');      } catch {}
try { compression = require('compression'); } catch {}
try { morgan      = require('morgan');      } catch {}

let apiLimiter, loginLimiter, exportLimiter;
try {
  const rl = require('./middleware/rateLimiter');
  apiLimiter   = rl.apiLimiter;
  loginLimiter = rl.loginLimiter;
  exportLimiter= rl.exportLimiter;
} catch {}

let cacheMiddleware, bustCacheOn;
try {
  const cache  = require('./middleware/cache');
  cacheMiddleware = cache.cacheMiddleware;
  bustCacheOn     = cache.bustCacheOn;
} catch {}

const noop   = (req, res, next) => next();
const noCache= () => noop;
const noBust = () => noop;

const app    = express();
const isProd = process.env.NODE_ENV === 'production';

// ── Security & compression ─────────────────────────────────────────────────
if (helmet)      app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
if (compression) app.use(compression({ level: 6, threshold: 1024 }));
if (morgan)      app.use(morgan('dev'));

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'https://santacatalina-rentals.netlify.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
];

app.options('*', cors({ origin: true, credentials: true }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // allow all for local use
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 200,
}));

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'srms_local_secret',
  resave:            false,
  saveUninitialized: false,
  rolling:           true,
  cookie: {
    secure:   false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   Number(process.env.SESSION_MAX_AGE) || 8 * 60 * 60 * 1000,
  },
}));

// ── Rate limiting ──────────────────────────────────────────────────────────
if (apiLimiter)   app.use('/api', apiLimiter);

// ── API Routes ─────────────────────────────────────────────────────────────
const cm = cacheMiddleware || noCache;
const bc = bustCacheOn     || noBust;

app.use('/api/auth',             loginLimiter || noop, require('./routes/authRoutes'));
app.use('/api/dashboard',        cm(30,'dashboard'),         require('./routes/dashboardRoutes'));
app.use('/api/buildings',        bc('buildings'),    cm(60,'buildings'),         require('./routes/buildingRoutes'));
app.use('/api/stall-categories', bc('cats'),         cm(120,'cats'),             require('./routes/categoryRoutes'));
app.use('/api/stalls',           bc('stalls'),       cm(15,'stalls'),            require('./routes/stallRoutes'));
app.use('/api/owners',           bc('owners'),       cm(15,'owners'),            require('./routes/ownerRoutes'));
app.use('/api/payments',         bc('payments'),     cm(10,'payments'),          require('./routes/paymentRoutes'));
app.use('/api/staff',            require('./routes/staffRoutes'));
app.use('/api/reports',          exportLimiter || noop,      require('./routes/reportRoutes'));
app.use('/api/electric-fees',    bc('ef'),           cm(15,'ef'),                require('./routes/electricFeeRoutes'));
app.use('/api/balances',         require('./routes/balanceRoutes'));
app.use('/api/night-market',     require('./routes/nightMarketRoutes'));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const db = require('./database/db');
  db.execute('SELECT 1')
    .then(() => res.json({ status: 'ok', db: 'connected', uptime: Math.round(process.uptime()) }))
    .catch(() => res.status(503).json({ status: 'degraded', db: 'disconnected' }));
});

// ── Serve React frontend (built files) ─────────────────────────────────────
const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  console.log('📦 Serving React frontend from client/dist/');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('⚠️  No client/dist found. Run "npm run build" in the client folder first.');
  app.get('/', (req, res) => res.json({
    status: 'API running',
    message: 'Frontend not built. Run: cd ../client && npm run build'
  }));
}

// ── Error handlers ─────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🏛️  SRMS running → http://localhost:${PORT}`);
  console.log(`   Mode: ${isProd ? 'Production' : 'Development'}`);
  console.log(`   DB  : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
});

const shutdown = (sig) => {
  server.close(() => { console.log('\nServer stopped.'); process.exit(0); });
  setTimeout(() => process.exit(1), 5000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', r => console.error('Unhandled:', r));
process.on('uncaughtException',  e => console.error('Uncaught:', e.message));

module.exports = app;