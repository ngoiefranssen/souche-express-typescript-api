import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import { errorHandler, notFoundHandler } from './utils/errors';
import { routesProvider } from './routes/provider.routes';
import { env } from './db/config/env.config';
import { sequelize } from './db/sequelize';
import { configureStaticFiles } from './middlewares/static.middleware';
import { startSessionCleanupScheduler } from './utils/session_cleaner';
import { startTokenCleanupJobs } from './utils/token_cleaner';

const app = express();

// ==================== Session AVANT tout (CRITIQUE) ====================
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: env.NODE_ENV === 'development' ? 'localhost' : undefined
  },
  name: 'sessionId'
}));

// ==================== CORS Configuration ====================
const allowedOrigins = env.NODE_ENV === 'production' 
  ? ['https://namedomaine.com'] 
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Handle preflight requests explicitly
app.options('*', cors());

// ==================== Debug Middleware (TEMPORARY - Remove after fixing) ====================
app.use((_req, _res, next) => {
  next();
});

// ==================== Sécurité ====================
// Configuration différente selon l'environnement
if (env.NODE_ENV === 'production') {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://namedomaine.com"],
      },
    },
  }));
} else {
  // Development: Désactiver toutes les protections problématiques
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
}

// ==================== Middlewares généraux ====================
app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Gestion des uploads de fichiers
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: env.NODE_ENV === 'development',
  })
);

configureStaticFiles(app);

// ==================== Health check AVANT le rate limiter ====================
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// ==================== Rate limiting SEULEMENT sur /api/v1 ====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  skip: (req) => req.path === '/health',
});

// ==================== Routes ====================
app.use('/api/v1', limiter, routesProvider);

// ==================== Gestion des erreurs ====================
app.use(notFoundHandler);
app.use(errorHandler);

// ==================== Démarrage du serveur ====================
const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    if (env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
    }
    
    // Démarrer les jobs de nettoyage automatique
    startSessionCleanupScheduler();
    startTokenCleanupJobs();

    const port = env.PORT || 7700;

    app.listen(port, () => {
      console.log(`\n Serveur démarré sur http://localhost:${port}`);
      if (env.NODE_ENV === 'development') {
        allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
      }
    });

  } catch (error) {
    process.exit(1);
  }
};

startServer();