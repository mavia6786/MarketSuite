require('dotenv').config();
try { require('express-async-errors'); } catch (e) { console.warn('Run `npm install` (express-async-errors missing)'); } // async route errors -> error handler instead of crashing
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
mongoose.plugin(require('./plugins/shopScope')); // must be registered before any model is compiled (routes below)
const connectDB = require('./config/db');
const rateLimit = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const shopRoutes = require('./routes/shopRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const shoesRoutes = require('./routes/shoesRoutes');
const clothesRoutes = require('./routes/clothesRoutes');
const financeRoutes = require('./routes/financeRoutes');
const publicRoutes = require('./routes/publicRoutes');
const onlineOrderRoutes = require('./routes/onlineOrderRoutes');

const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy (Nginx/Render/Railway) set TRUST_PROXY=1 so req.ip is the real client IP (rate limits, audit log).
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);

app.use(helmet()); // secure default headers (nosniff, frameguard, HSTS on https, etc.)

// CORS: set CORS_ORIGIN to a comma-separated list of allowed frontend origins.
// Development (NODE_ENV != production) with no CORS_ORIGIN allows any origin; production without it allows none (same-origin only).
const allowed = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
if (allowed.length) app.use(cors({ origin: allowed }));
else if (process.env.NODE_ENV !== 'production') app.use(cors());

app.use(express.json({ limit: '1mb' }));

// General per-IP safety net for the whole API (generous: it only stops runaway clients).
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: Number(process.env.API_RATE_MAX || 600), skip: (req) => req.path === '/health' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', userRoutes.auditRouter);
app.use('/api/shop', shopRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/shoes', shoesRoutes);
app.use('/api/clothes', clothesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/online-orders', onlineOrderRoutes);
app.use('/api/public', publicRoutes); // anonymous, whitelisted (see routes/publicRoutes.js)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.', code: 'NOT_FOUND' }));

// Central error handler. Every error response is JSON: { message, code? }.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body.', code: 'BAD_JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large.', code: 'TOO_LARGE' });
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ message: err.name === 'CastError' ? 'Invalid id or value.' : err.message, code: 'VALIDATION' });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'A record with the same unique value already exists.', code: 'DUPLICATE' });
  console.error(err);
  res.status(500).json({ message: 'Internal server error.', code: 'SERVER_ERROR' });
});

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

// Start listening only after the database is connected.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)));
}

module.exports = app;
