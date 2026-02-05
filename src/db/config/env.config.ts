import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(7700),
  
  // Database
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  
  // JWT - Access Token (court pour la sécurité)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
  JWT_ACCESS_EXPIRE: z.string().default('15m'), // Token court : 15 minutes
  
  // JWT - Refresh Token (long pour l'UX)
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire au moins 32 caractères'),
  JWT_REFRESH_EXPIRE: z.string().default('7d'), // Refresh : 7 jours
  
  // Session
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET doit faire au moins 32 caractères'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  
  // CSRF (optionnel)
  CSRF_SECRET: z.string().min(32).optional(),
  
  // Cloudflare Turnstile (optionnel)
  TURNSTILE_SECRET_KEY: z.string().optional(),
});

// Validation et export
export const env = envSchema.parse(process.env);

// Type inféré automatiquement
export type Env = z.infer<typeof envSchema>;