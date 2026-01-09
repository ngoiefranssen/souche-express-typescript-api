import { Request, Response, NextFunction } from 'express';
import { env } from '../db/config/env.config';

// ==================== Classes d'erreurs personnalisées ====================
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Données de validation invalides') {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée') {
    super(404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Accès interdit') {
    super(403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflit avec une ressource existante') {
    super(409, message);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Erreur de base de données') {
    super(500, message);
  }
}

// ==================== Gestionnaire d'erreurs principal ====================
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log de l'erreur pour le debug
  if (env.NODE_ENV === 'development') {
    console.error('Erreur capturée:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error('Erreur:', err.message);
  }

  // Si c'est une erreur opérationnelle gérée (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(env.NODE_ENV === 'development' && {
        stack: err.stack,
        path: req.path,
      }),
    });
    return;
  }

  // Gestion des erreurs PostgreSQL
  if ((err as any).code) {
    const pgError = err as any;

    switch (pgError.code) {
      case '23505': // Contrainte unique violée
        res.status(409).json({
          status: 'error',
          message: 'Cette ressource existe déjà',
          ...(env.NODE_ENV === 'development' && {
            detail: pgError.detail,
            constraint: pgError.constraint,
          }),
        });
        return;

      case '23503': // Violation de clé étrangère
        res.status(400).json({
          status: 'error',
          message: 'Référence invalide à une ressource inexistante',
          ...(env.NODE_ENV === 'development' && {
            detail: pgError.detail,
            constraint: pgError.constraint,
          }),
        });
        return;

      case '23502': // Violation NOT NULL
        res.status(400).json({
          status: 'error',
          message: 'Champ requis manquant',
          ...(env.NODE_ENV === 'development' && {
            column: pgError.column,
            table: pgError.table,
          }),
        });
        return;

      case '22P02': // Format invalide (ex: UUID invalide)
        res.status(400).json({
          status: 'error',
          message: 'Format de données invalide',
          ...(env.NODE_ENV === 'development' && {
            detail: pgError.message,
          }),
        });
        return;

      case '42P01': // Table inexistante
        res.status(500).json({
          status: 'error',
          message: 'Erreur de configuration de la base de données',
          ...(env.NODE_ENV === 'development' && {
            detail: 'Table inexistante',
          }),
        });
        return;

      case '42703': // Colonne inexistante
        res.status(500).json({
          status: 'error',
          message: 'Erreur de structure de la base de données',
          ...(env.NODE_ENV === 'development' && {
            detail: 'Colonne inexistante',
          }),
        });
        return;

      case '08006': // Erreur de connexion
        res.status(503).json({
          status: 'error',
          message: 'Service temporairement indisponible',
          ...(env.NODE_ENV === 'development' && {
            detail: 'Erreur de connexion à la base de données',
          }),
        });
        return;
      case '08003': // Connexion inexistante
        res.status(503).json({
          status: 'error',
          message: 'Service temporairement indisponible',
          ...(env.NODE_ENV === 'development' && {
            detail: 'Erreur de connexion à la bconsolease de données',
          }),
        });
        return;

      default:
        res.status(500).json({
          status: 'error',
          message: 'Erreur de base de données',
          ...(env.NODE_ENV === 'development' && {
            code: pgError.code,
            detail: pgError.detail,
          }),
        });
        return;
    }
  }

  // Erreurs de validation Zod (si vous utilisez Zod)
  if (err.name === 'ZodError') {
    res.status(400).json({
      status: 'error',
      message: 'Erreur de validation des données',
      ...(env.NODE_ENV === 'development' && {
        errors: (err as any).errors,
      }),
    });
    return;
  }

  // Erreur JSON malformé
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      status: 'error',
      message: 'Format JSON invalide',
    });
    return;
  }
  res.status(500).json({
    status: 'error',
    message: 'Erreur interne du serveur',
    ...(env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
      name: err.name,
    }),
  });
};

// ==================== Middleware pour les routes non trouvées ====================
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    status: 'error',
    message: 'Route non trouvée',
    ...(env.NODE_ENV === 'development' && {
      path: req.path,
      method: req.method,
    }),
  });
};

// ==================== Utilitaire pour wrapper les async handlers ====================
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};