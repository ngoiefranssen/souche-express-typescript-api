import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorization.middleware';
import { validate } from '../../middlewares/validation.middleware';
import {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  assignPermissionToRole,
  revokePermissionFromRole,
  getRolePermissions,
  getPermissionsByCategory,
} from '../../controllers/permission/permission.controller';
import {
  createPermissionSchema,
  updatePermissionSchema,
  assignPermissionSchema,
  revokePermissionSchema,
  getPermissionsSchema,
  getPermissionByIdSchema,
  getRolePermissionsSchema,
} from '../../schemas/admin/permissions.schema';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticateToken);

/**
 * GET /api/v1/permissions
 * Récupère toutes les permissions (avec filtres optionnels)
 * Permission requise: permissions:read
 */
router.get(
  '/',
  authorize('permissions:read', { audit: true }),
  validate(getPermissionsSchema),
  getAllPermissions
);

/**
 * GET /api/v1/permissions/by-category
 * Récupère les permissions groupées par catégorie
 * Permission requise: permissions:read
 */
router.get(
  '/by-category',
  authorize('permissions:read'),
  getPermissionsByCategory
);

/**
 * GET /api/v1/permissions/:id
 * Récupère une permission par ID
 * Permission requise: permissions:read
 */
router.get(
  '/:id',
  authorize('permissions:read'),
  validate(getPermissionByIdSchema),
  getPermissionById
);

/**
 * POST /api/v1/permissions
 * Crée une nouvelle permission
 * Permission requise: permissions:create
 */
router.post(
  '/',
  authorize('permissions:create', { audit: true }),
  validate(createPermissionSchema),
  createPermission
);

/**
 * PUT /api/v1/permissions/:id
 * Met à jour une permission
 * Permission requise: permissions:update
 */
router.put(
  '/:id',
  authorize('permissions:update', { audit: true }),
  validate(updatePermissionSchema),
  updatePermission
);

/**
 * DELETE /api/v1/permissions/:id
 * Supprime une permission
 * Permission requise: permissions:delete
 */
router.delete(
  '/:id',
  authorize('permissions:delete', { audit: true }),
  validate(getPermissionByIdSchema),
  deletePermission
);

/**
 * POST /api/v1/permissions/assign
 * Assigne une permission à un rôle
 * Permission requise: permissions:manage
 */
router.post(
  '/assign',
  authorize('permissions:manage', { audit: true }),
  validate(assignPermissionSchema),
  assignPermissionToRole
);

/**
 * POST /api/v1/permissions/revoke
 * Révoque une permission d'un rôle
 * Permission requise: permissions:manage
 */
router.post(
  '/revoke',
  authorize('permissions:manage', { audit: true }),
  validate(revokePermissionSchema),
  revokePermissionFromRole
);

/**
 * GET /api/v1/permissions/role/:roleId
 * Récupère toutes les permissions d'un rôle
 * Permission requise: permissions:read
 */
router.get(
  '/role/:roleId',
  authorize('permissions:read'),
  validate(getRolePermissionsSchema),
  getRolePermissions
);

export default router;
