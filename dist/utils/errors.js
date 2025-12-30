"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.DatabaseError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
const env_1 = require("../db/config/env");
// ==================== Classes d'erreurs personnalisées ====================
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message = 'Données de validation invalides') {
        super(400, message);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(message = 'Ressource non trouvée') {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Non autorisé') {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Accès interdit') {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message = 'Conflit avec une ressource existante') {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
class DatabaseError extends AppError {
    constructor(message = 'Erreur de base de données') {
        super(500, message);
    }
}
exports.DatabaseError = DatabaseError;
// ==================== Gestionnaire d'erreurs principal ====================
const errorHandler = (err, req, res, _next) => {
    // Log de l'erreur pour le debug
    if (env_1.env.NODE_ENV === 'development') {
        console.error('Erreur capturée:', {
            name: err.name,
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }
    else {
        console.error('Erreur:', err.message);
    }
    // Si c'est une erreur opérationnelle gérée (AppError)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            ...(env_1.env.NODE_ENV === 'development' && {
                stack: err.stack,
                path: req.path,
            }),
        });
        return;
    }
    // Gestion des erreurs PostgreSQL
    if (err.code) {
        const pgError = err;
        switch (pgError.code) {
            case '23505': // Contrainte unique violée
                res.status(409).json({
                    status: 'error',
                    message: 'Cette ressource existe déjà',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: pgError.detail,
                        constraint: pgError.constraint,
                    }),
                });
                return;
            case '23503': // Violation de clé étrangère
                res.status(400).json({
                    status: 'error',
                    message: 'Référence invalide à une ressource inexistante',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: pgError.detail,
                        constraint: pgError.constraint,
                    }),
                });
                return;
            case '23502': // Violation NOT NULL
                res.status(400).json({
                    status: 'error',
                    message: 'Champ requis manquant',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        column: pgError.column,
                        table: pgError.table,
                    }),
                });
                return;
            case '22P02': // Format invalide (ex: UUID invalide)
                res.status(400).json({
                    status: 'error',
                    message: 'Format de données invalide',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: pgError.message,
                    }),
                });
                return;
            case '42P01': // Table inexistante
                res.status(500).json({
                    status: 'error',
                    message: 'Erreur de configuration de la base de données',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: 'Table inexistante',
                    }),
                });
                return;
            case '42703': // Colonne inexistante
                res.status(500).json({
                    status: 'error',
                    message: 'Erreur de structure de la base de données',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: 'Colonne inexistante',
                    }),
                });
                return;
            case '08006': // Erreur de connexion
                res.status(503).json({
                    status: 'error',
                    message: 'Service temporairement indisponible',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: 'Erreur de connexion à la base de données',
                    }),
                });
                return;
            case '08003': // Connexion inexistante
                res.status(503).json({
                    status: 'error',
                    message: 'Service temporairement indisponible',
                    ...(env_1.env.NODE_ENV === 'development' && {
                        detail: 'Erreur de connexion à la bconsolease de données',
                    }),
                });
                return;
            default:
                console.error('Erreur PostgreSQL non gérée:', pgError);
                res.status(500).json({
                    status: 'error',
                    message: 'Erreur de base de données',
                    ...(env_1.env.NODE_ENV === 'development' && {
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
            ...(env_1.env.NODE_ENV === 'development' && {
                errors: err.errors,
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
        ...(env_1.env.NODE_ENV === 'development' && {
            error: err.message,
            stack: err.stack,
            name: err.name,
        }),
    });
};
exports.errorHandler = errorHandler;
// ==================== Middleware pour les routes non trouvées ====================
const notFoundHandler = (req, res, _next) => {
    res.status(404).json({
        status: 'error',
        message: 'Route non trouvée',
        ...(env_1.env.NODE_ENV === 'development' && {
            path: req.path,
            method: req.method,
        }),
    });
};
exports.notFoundHandler = notFoundHandler;
// ==================== Utilitaire pour wrapper les async handlers ====================
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
