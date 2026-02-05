import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { PermissionChecker } from '../utils/permission_checker';
import { UserContext, CheckPermissionOptions } from '../types/permissions';
import UserModel from '../models/admin/users.model';
import ProfileModel from '../models/admin/profil.model';
import RoleModel from '../models/admin/role.model';
import PermissionModel from '../models/permission/permission.model';
import { logAudit } from '../utils/audit';

/**
 * Interface étendue de la requête avec contexte utilisateur complet
 */
export interface AuthorizedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    profileId?: number;
  };
  userContext?: UserContext;
}

/**
 * Options pour le middleware d'autorisation
 */
interface AuthorizationOptions extends CheckPermissionOptions {
  /**
   * Permet au propriétaire de la ressource d'y accéder
   * Fonction pour extraire l'ID du propriétaire depuis la requête
   */
  allowOwner?: (req: AuthorizedRequest) => number | Promise<number>;
  
  /**
   * Message d'erreur personnalisé
   */
  errorMessage?: string;
  
  /**
   * Log l'accès (autorisé ou refusé)
   */
  audit?: boolean;
}

/**
 * Charge le contexte utilisateur complet avec rôles et permissions
 * @param userId ID de l'utilisateur
 * @returns Contexte utilisateur enrichi
 */
async function loadUserContext(userId: number): Promise<UserContext> {
  const user = await UserModel.findByPk(userId, {
    include: [
      {
        model: ProfileModel,
        as: 'profile',
        include: [
          {
            model: RoleModel,
            as: 'roles',
            include: [
              {
                model: PermissionModel,
                as: 'permissions',
                through: { attributes: [] },
              },
            ],
          },
        ],
      },
    ],
  });

  if (!user || !user.profile) {
    throw new AppError(404, 'Utilisateur ou profil non trouvé');
  }

  // Extraire les rôles
  const roles = user.profile.roles?.map((role) => role.label) || [];

  // Extraire toutes les permissions de tous les rôles
  const permissions = PermissionChecker.extractPermissions(user.profile.roles || []);

  // Construire le contexte
  const userContext: UserContext = {
    userId: user.id,
    email: user.email,
    profileId: user.profile_id,
    roles,
    permissions,
    attributes: {
      department: user.profile.description, // Adapter selon votre schéma
      employmentStatus: user.employmentStatus?.label,
      // Ajoutez d'autres attributs pertinents pour ABAC
    },
  };

  return userContext;
}

/**
 * Middleware principal d'autorisation
 * Vérifie que l'utilisateur a les permissions requises
 * 
 * @param requiredPermissions Permission(s) requise(s) (string ou tableau)
 * @param options Options d'autorisation
 * 
 * @example
 * // Permission unique
 * router.get('/users', authorize('users:read'), getUsers);
 * 
 * @example
 * // Plusieurs permissions (mode OR par défaut)
 * router.post('/users', authorize(['users:create', 'users:manage']), createUser);
 * 
 * @example
 * // Toutes les permissions requises (mode AND)
 * router.delete('/users/:id', authorize(['users:delete', 'audit:create'], { requireAll: true }), deleteUser);
 * 
 * @example
 * // Autoriser le propriétaire
 * router.put('/users/:id', authorize('users:update', {
 *   allowOwner: (req) => parseInt(req.params.id)
 * }), updateUser);
 */
export function authorize(
  requiredPermissions: string | string[],
  options: AuthorizationOptions = {}
) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user || !req.user.userId) {
        throw new AppError(401, 'Authentification requise');
      }

      // Charger le contexte utilisateur complet (avec cache possible)
      const userContext = await loadUserContext(req.user.userId);
      req.userContext = userContext;

      // Vérifier si l'utilisateur est propriétaire (si option activée)
      if (options.allowOwner) {
        const ownerId = await options.allowOwner(req);
        if (PermissionChecker.isResourceOwner(userContext, ownerId)) {
          // Log si audit activé
          if (options.audit) {
            await logAudit({
              userId: userContext.userId,
              action: 'access_granted_owner',
              resource: req.path,
              details: { reason: 'Resource owner' },
            });
          }
          return next();
        }
      }

      // Vérifier les permissions
      const result = PermissionChecker.check(userContext, requiredPermissions, {
        requireAll: options.requireAll,
        context: options.context,
        strict: options.strict,
      });

      if (!result.allowed) {
        // Log refus si audit activé
        if (options.audit) {
          await logAudit({
            userId: userContext.userId,
            action: 'access_denied',
            resource: req.path,
            details: {
              requiredPermissions,
              reason: result.reason,
            },
          });
        }

        throw new AppError(
          403,
          options.errorMessage || result.reason || 'Accès refusé : permissions insuffisantes'
        );
      }

      // Log accès autorisé si audit activé
      if (options.audit) {
        await logAudit({
          userId: userContext.userId,
          action: 'access_granted',
          resource: req.path,
          details: {
            matchedPermission: result.matchedPermission,
            requiredPermissions,
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware pour vérifier un rôle spécifique
 * @param roleName Nom du rôle requis
 * @param options Options d'autorisation
 * 
 * @example
 * router.get('/admin/dashboard', requireRole('Admin'), getDashboard);
 */
export function requireRole(roleName: string | string[], options: AuthorizationOptions = {}) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError(401, 'Authentification requise');
      }

      const userContext = await loadUserContext(req.user.userId);
      req.userContext = userContext;

      const roles = Array.isArray(roleName) ? roleName : [roleName];
      const hasRole = PermissionChecker.hasAnyRole(userContext, roles);

      if (!hasRole) {
        if (options.audit) {
          await logAudit({
            userId: userContext.userId,
            action: 'access_denied',
            resource: req.path,
            details: { requiredRoles: roles, userRoles: userContext.roles },
          });
        }

        throw new AppError(
          403,
          options.errorMessage || `Rôle requis : ${roles.join(' ou ')}`
        );
      }

      if (options.audit) {
        await logAudit({
          userId: userContext.userId,
          action: 'access_granted',
          resource: req.path,
          details: { matchedRole: userContext.roles.find((r) => roles.includes(r)) },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware pour vérifier plusieurs rôles (tous requis)
 * @param roleNames Noms des rôles requis
 * @param options Options d'autorisation
 */
export function requireAllRoles(roleNames: string[], options: AuthorizationOptions = {}) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError(401, 'Authentification requise');
      }

      const userContext = await loadUserContext(req.user.userId);
      req.userContext = userContext;

      const hasAllRoles = PermissionChecker.hasAllRoles(userContext, roleNames);

      if (!hasAllRoles) {
        throw new AppError(
          403,
          options.errorMessage || `Tous les rôles requis : ${roleNames.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware pour autoriser seulement le propriétaire de la ressource
 * @param getResourceOwnerId Fonction pour extraire l'ID du propriétaire
 * @param options Options d'autorisation
 * 
 * @example
 * router.put('/users/:id/profile', requireOwnership((req) => parseInt(req.params.id)), updateProfile);
 */
export function requireOwnership(
  getResourceOwnerId: (req: AuthorizedRequest) => number | Promise<number>,
  options: AuthorizationOptions = {}
) {
  return async (req: AuthorizedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError(401, 'Authentification requise');
      }

      const userContext = await loadUserContext(req.user.userId);
      req.userContext = userContext;

      const ownerId = await getResourceOwnerId(req);

      if (!PermissionChecker.isResourceOwner(userContext, ownerId)) {
        throw new AppError(
          403,
          options.errorMessage || 'Vous ne pouvez accéder qu\'à vos propres ressources'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware optionnel : charge le contexte utilisateur sans vérification
 * Utile pour les endpoints qui ont besoin du contexte mais pas de vérification stricte
 */
export async function loadContext(
  req: AuthorizedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    if (req.user && req.user.userId) {
      req.userContext = await loadUserContext(req.user.userId);
    }
    next();
  } catch (error) {
    next(error);
  }
}
