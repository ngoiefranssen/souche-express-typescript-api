import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(7700),
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRE: z.string().default('7d'),
});

export const env = envSchema.parse(process.env);