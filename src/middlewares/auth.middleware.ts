import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../db/config/env';
import { AppError } from '../utils/errors';
import UserSession from '../models/auth/user.session.model';

interface JwtPayload {
  userId: number;
  email: string;
  profileId?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError(401, 'Token d\'authentification manquant');
    }

    // Vérifier le JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Vérifier la session en base de données
    const session = await UserSession.findOne({
      where: {
        token,
        userId: decoded.userId,
        isActive: true,
      },
    });

    if (!session) {
      throw new AppError(401, 'Session invalide ou expirée');
    }

    // Vérifier l'inactivité (1 heure = 3600000 ms)
    const now = new Date();
    const inactivityLimit = 60 * 60 * 1000; // 1 heure en millisecondes
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();

    if (timeSinceLastActivity > inactivityLimit) {
      // Désactiver la session
      await session.update({ isActive: false });
      throw new AppError(401, 'Session expirée en raison d\'inactivité');
    }

    // Mettre à jour la dernière activité
    await session.update({ lastActivity: now });

    // Attacher l'utilisateur à la requête
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Token invalide'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token expiré'));
    } else {
      next(error);
    }
  }
};