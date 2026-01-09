import { Sequelize } from 'sequelize-typescript';
import { globSync } from 'glob';
import path from 'path';
import { env } from './config/env.config';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  logging: env.NODE_ENV === 'development' ? console.log : false,
  define: { timestamps: true, underscored: false },
});

// --- auto-load ---
// Détecter si on est dans le dossier compilé (dist/) ou source (src/)
const isCompiledCode = __dirname.includes('/dist/');
const ext = isCompiledCode ? 'js' : 'ts';

// Chemin corrigé : depuis src/db/ ou dist/db/ vers models/
const modelsPath = path.resolve(__dirname, '../models');

// Chercher dans TOUS les sous-dossiers
const files = globSync(`**/*.model.${ext}`, {
  cwd: modelsPath,
  absolute: true,
  ignore: ['**/node_modules/**'],
});

if (files.length === 0) {
  const fs = require('fs');
  if (fs.existsSync(modelsPath)) {
    console.error('Contenu du dossier models:', fs.readdirSync(modelsPath));
  } else {
    console.error('Le dossier models n\'existe pas à ce chemin !');
  }
}

sequelize.addModels(files);