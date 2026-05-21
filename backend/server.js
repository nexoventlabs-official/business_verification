require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');

const { connectDB } = require('./src/db/connection');
const authRouter = require('./src/routes/auth');
const whatsappRouter = require('./src/routes/whatsapp');
const webhookRouter = require('./src/routes/webhook');
const verificationRouter = require('./src/routes/verification');
const { router: adminRouter } = require('./src/routes/admin');

const app = express();

app.use(morgan('dev'));
const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));
app.options('*', cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd },
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tenants', (_req, res) => res.status(410).json({ error: 'tenant_setup_removed' }));

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: err.response?.data || undefined,
  });
});

const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`BSP backend listening on :${PORT}`)))
  .catch((e) => { console.error('[startup] DB connection failed:', e.message); process.exit(1); });
