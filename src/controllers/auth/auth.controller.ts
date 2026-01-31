import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { LoginInput } from '../../schemas/auth/auth.schema';
import { env } from '../../db/config/env.config';
import { AppError } from '../../utils/errors';
import { AuthRequest } from '../../middlewares/auth.middleware';
import User from '../../models/admin/users.model';
import UserSession from '../../models/auth/user.session.model';
import { Op } from 'sequelize';

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
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    // Générer le token JWT avec expiration à 1 heure
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        profileId: user.profile_id 
      },
      env.JWT_SECRET,
      { expiresIn: '1h' } as SignOptions
    );

    // Créer une session en base de données
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 heure

    await UserSession.create({
      userId: user.id,
      token,
      lastActivity: now,
      expiresAt,
      isActive: true,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Retourner la réponse
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
        token,
        expiresIn: '1h',
      },
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

    // Désactiver la session en base de données
    const session = await UserSession.findOne({
      where: { token, isActive: true }
    });

    if (session) {
      await session.update({ isActive: false });
    }

    res.json({
      status: 'success',
      message: 'Déconnexion réussie',
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

// // Démarrer le nettoyage automatique des sessions toutes les heures
// export const audit = async (
//   req: Request<{}, {}, { email?: string; success: boolean; ip?: string }>,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     /* ---------- Validation mini ---------- */
//     const { email, success, ip } = req.body;
//     if (typeof success !== 'boolean') {
//       throw new AppError(400, 'Champ "success" manquant ou invalide');
//     }

//     /* ---------- CSRF simple (double-submit) ---------- */
//     const headerToken = req.headers['x-csrf-token'];
//     const cookieToken = req.cookies?.['csrf-token'];
//     if (!headerToken || headerToken !== cookieToken) {
//       throw new AppError(403, 'Jeton CSRF invalide');
//     }

//     /* ---------- Log sécurisé (sans PII clair) ---------- */
//     const log = await AuditLog.create({
//       event:   'login_attempt',
//       success,
//       emailHash: email ? crypto.createHash('sha256').update(email + env.PII_HASH_SALT).digest('hex') : null,
//       ipHash:    ip    ? crypto.createHash('sha256').update(ip    + env.PII_HASH_SALT).digest('hex') : null,
//       userAgent: req.headers['user-agent']?.slice(0, 255),
//       createdAt: new Date(),
//     });

//     res.json({ status: 'success', message: 'Audit enregistré' });
//   } catch (err) {
//     next(err);
//   }
// };