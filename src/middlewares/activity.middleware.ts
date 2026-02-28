import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import UserSession from '../models/auth/user.session.model';

/**
 * Middleware pour mettre à jour l'activité de l'utilisateur
 * À utiliser sur toutes les routes protégées
 */
export const trackActivity = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    
    if (userId) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        // Mettre à jour lastActivity de la session
        await UserSession.update(
          { lastActivity: new Date() },
          {
            where: {
              userId,
              token,
              isActive: true,
            },
          }
        );
      }
    }

    next();
  } catch (error) {
    // Ne pas bloquer la requête si l'update échoue
    console.error('Erreur lors du tracking d\'activité:', error);
    next();
  }
};

/**
 * Configuration de la durée d'inactivité maximale
 */
export const INACTIVITY_CONFIG = {
  // Durée avant déconnexion automatique (en millisecondes)
  MAX_INACTIVITY_MS: 30 * 60 * 1000, // 30 minutes par défaut
  
  // Durée d'avertissement avant déconnexion (en millisecondes)
  WARNING_BEFORE_LOGOUT_MS: 5 * 60 * 1000, // 5 minutes avant
};
