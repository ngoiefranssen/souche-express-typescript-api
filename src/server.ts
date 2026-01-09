import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import fileUpload from 'express-fileupload';
import { errorHandler, notFoundHandler } from './utils/errors';
import { routesProvider } from './routes/provider.routes';
import { env } from './db/config/env.config';
import { sequelize } from './db/sequelize';
import { configureStaticFiles } from './middlewares/static.middleware';
import { startSessionCleanupScheduler } from './utils/session_cleaner';

const app = express();

// ==================== Sécurité ====================
app.use(helmet());

app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? 'https://namedomaine.com' : '*',
    credentials: true,
  })
);

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
    debug: true,
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
});

// ==================== Routes ====================
app.use('/api/v1', limiter, routesProvider);

// Démarrer le nettoyage automatique des sessions
startSessionCleanupScheduler();

// ==================== Gestion des erreurs ====================
// 404 - DOIT être après toutes les routes
app.use(notFoundHandler);

// Gestionnaire d'erreurs global - TOUJOURS EN DERNIER
app.use(errorHandler);

// ==================== Démarrage du serveur ====================
const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();

    // Synchroniser les modèles (uniquement en développement)
    if (env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
    }

    // Démarrer le serveur
    const port = env.PORT || 7700;

    app.listen(port, () => {
      console.log(`\n Serveur démarré sur http://localhost:${port}`);
    });

  } catch (error) {
    process.exit(1);
  }
};

startServer();