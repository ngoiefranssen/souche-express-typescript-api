import { z } from 'zod';

/**
 * Schéma pour créer une permission
 */
export const createPermissionSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères')
      .regex(
        /^[a-z_]+:(read|create|update|delete|\*|execute|manage)$/i,
        'Format requis: "resource:action" (ex: users:read)'
      ),
    resource: z
      .string()
      .min(2, 'La ressource doit contenir au moins 2 caractères')
      .max(50, 'La ressource ne peut pas dépasser 50 caractères'),
    action: z.enum(['read', 'create', 'update', 'delete', '*', 'execute', 'manage']),
    description: z.string().max(255, 'La description ne peut pas dépasser 255 caractères').optional(),
    category: z.string().max(50, 'La catégorie ne peut pas dépasser 50 caractères').optional(),
    priority: z.number().int().min(0).max(100).optional(),
    conditions: z.record(z.string(), z.any()).optional(),
  }),
});

/**
 * Schéma pour mettre à jour une permission
 */
export const updatePermissionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID invalide'),
  }),
  body: z.object({
    name: z
      .string()
      .min(2)
      .max(100)
      .regex(/^[a-z_]+:(read|create|update|delete|\*|execute|manage)$/i)
      .optional(),
    resource: z.string().min(2).max(50).optional(),
    action: z.enum(['read', 'create', 'update', 'delete', '*', 'execute', 'manage']).optional(),
    description: z.string().max(255).optional(),
    category: z.string().max(50).optional(),
    priority: z.number().int().min(0).max(100).optional(),
    conditions: z.record(z.string(), z.any()).optional(),
  }),
});

/**
 * Schéma pour assigner une permission à un rôle
 */
export const assignPermissionSchema = z.object({
  body: z.object({
    roleId: z.number().int().positive('L\'ID du rôle doit être positif'),
    permissionId: z.number().int().positive('L\'ID de la permission doit être positif'),
    overrideConditions: z.record(z.string(), z.any()).optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

/**
 * Schéma pour révoquer une permission d'un rôle
 */
export const revokePermissionSchema = z.object({
  body: z.object({
    roleId: z.number().int().positive('L\'ID du rôle doit être positif'),
    permissionId: z.number().int().positive('L\'ID de la permission doit être positif'),
  }),
});

/**
 * Schéma pour récupérer les permissions avec filtres
 */
export const getPermissionsSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    resource: z.string().optional(),
    action: z.enum(['read', 'create', 'update', 'delete', '*', 'execute', 'manage']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

/**
 * Schéma pour récupérer une permission par ID
 */
export const getPermissionByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID invalide'),
  }),
});

/**
 * Schéma pour récupérer les permissions d'un rôle
 */
export const getRolePermissionsSchema = z.object({
  params: z.object({
    roleId: z.string().regex(/^\d+$/, 'ID de rôle invalide'),
  }),
});
