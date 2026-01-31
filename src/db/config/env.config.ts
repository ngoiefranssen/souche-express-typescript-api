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
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
  JWT_EXPIRE: z.string().default('2h'),
  
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