import { Pool } from 'pg';
import { env } from './env.config';

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL:', err);
  process.exit(-1);
});