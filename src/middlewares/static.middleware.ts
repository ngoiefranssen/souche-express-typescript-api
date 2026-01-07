import express from 'express';
import path from 'path';

export const configureStaticFiles = (app: express.Application) => {
  // Servir les fichiers uploadés
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
};