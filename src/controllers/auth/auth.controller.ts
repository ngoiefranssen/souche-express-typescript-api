import { Request, Response, NextFunction } from 'express';
import { LoginInput } from '../../schemas/auth/auth.schema';
import { AppError } from '../../utils/errors';
import { AuthRequest } from '../../middlewares/auth.middleware';
import User from '../../models/admin/users.model';
import UserSession from '../../models/auth/user.session.model';
import { Op } from 'sequelize';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
  revokeAllUserTokens,
} from '../../utils/jwt';
import { logLogin, logLoginFailed, logLogout } from '../../utils/audit';

export const oauthAuthorize = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Rechercher l'utilisateur par email
    const user = await User.findOne({
      where: { email },
      include: [
        { association: 'profile' },
        { association: 'employmentStatus' }
      ]
    });

    if (!user) {
      // Log échec de connexion
      await logLoginFailed(email, req.ip || 'unknown', 'user_not_found');
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Log échec de connexion
      await logLoginFailed(email, req.ip || 'unknown', 'invalid_password');
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    // Générer une paire de tokens (access + refresh)
    const tokens = await generateTokenPair(
      user.id,
      user.email,
      user.profile_id,
      {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    );

    // Créer une session en base de données (compatibilité avec ancien système)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 heure

    await UserSession.create({
      userId: user.id,
      token: tokens.accessToken,
      lastActivity: now,
      expiresAt,
      isActive: true,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Log connexion réussie
    await logLogin(user.id, req.ip || 'unknown', req.headers['user-agent']);

    // Retourner la réponse avec les deux tokens
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profilePhoto: user.profilePhoto,
          profile: user.profile,
          employmentStatus: user.employmentStatus,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessExpiresIn,
        tokenType: 'Bearer',
      },
      message: 'Connexion réussie',
    });
  } catch (error) {
    next(error);
  }
};

export const oauthLogout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'Token manquant');
    }

    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(401, 'Utilisateur non authentifié');
    }

    // Désactiver la session en base de données
    const session = await UserSession.findOne({
      where: { token, isActive: true }
    });

    if (session) {
      await session.update({ isActive: false });
    }

    // Révoquer tous les refresh tokens de l'utilisateur
    await revokeAllUserTokens(userId, 'logout');

    // Log déconnexion
    await logLogout(userId, req.ip || 'unknown');

    res.json({
      status: 'success',
      message: 'Déconnexion réussie. Tous vos tokens ont été révoqués.',
    });
  } catch (error) {
    next(error);
  }
};

// Fonction pour nettoyer les sessions expirées (à exécuter périodiquement)
export const cleanExpiredSessions = async () => {
  try {
    const now = new Date();
    const inactivityLimit = new Date(now.getTime() - 60 * 60 * 1000); // 1 heure

    await UserSession.update(
      { isActive: false },
      {
        where: {
          isActive: true,
          lastActivity: {
            [Op.lt]: inactivityLimit,
          },
        },
      }
    );

  } catch (error) {
    console.error('Erreur lors du nettoyage des sessions:', error);
  }
};

/**
 * Rafraîchir l'access token à l'aide du refresh token
 */
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token manquant');
    }

    // Vérifier et décoder le refresh token
    const { payload, tokenRecord } = await verifyRefreshToken(refreshToken);

    // Récupérer les informations utilisateur
    const user = await User.findByPk(payload.userId, {
      include: [
        { association: 'profile' },
        { association: 'employmentStatus' }
      ]
    });

    if (!user) {
      throw new AppError(404, 'Utilisateur introuvable');
    }

    // Marquer le refresh token comme utilisé
    await tokenRecord.markAsUsed();

    // Générer un nouveau access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      profileId: user.profile_id,
    });

    // Mettre à jour la session si elle existe
    const session = await UserSession.findOne({
      where: { userId: user.id, isActive: true }
    });

    if (session) {
      session.token = newAccessToken;
      session.lastActivity = new Date();
      await session.save();
    }

    // Retourner le nouveau access token
    res.json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRE || '1h',
        tokenType: 'Bearer',
      },
      message: 'Token rafraîchi avec succès',
    });
  } catch (error) {
    // Si le refresh token est invalide, demander une nouvelle connexion
    if (error instanceof Error && error.message.includes('Refresh token')) {
      next(new AppError(401, 'Session expirée. Veuillez vous reconnecter.'));
    } else {
      next(error);
    }
  }
};

/**
 * Récupérer les informations de l'utilisateur connecté
 */
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(401, 'Utilisateur non authentifié');
    }

    // Récupérer l'utilisateur avec toutes ses relations
    const user = await User.findByPk(userId, {
      include: [
        { 
          association: 'profile',
          include: [
            {
              association: 'roles',
              through: { attributes: [] }, // Exclure la table de liaison
            }
          ]
        },
        { association: 'employmentStatus' }
      ],
    });

    if (!user) {
      throw new AppError(404, 'Utilisateur introuvable');
    }

    // Retourner les informations utilisateur
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profilePhoto: user.profilePhoto,
          profile: user.profile ? {
            id: user.profile.id,
            label: user.profile.label,
            description: user.profile.description,
            roles: user.profile.roles?.map(role => ({
              id: role.id,
              label: role.label,
              description: role.description,
            })) || [],
          } : null,
          employmentStatus: user.employmentStatus ? {
            id: user.employmentStatus.id,
            label: user.employmentStatus.label,
            description: user.employmentStatus.description,
          } : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// // Démarrer le nettoyage automatique des sessions toutes les heures
