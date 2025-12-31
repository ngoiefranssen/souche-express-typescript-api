import { z } from 'zod';

// ==================== Schéma de création ====================
export const createRoleSchema = z.object({
  body: z.object({
    libelle_role: z
      .string()
      .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
      .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
      .trim(),
    descr_role: z
      .string()
      .max(254, { message: 'La description ne peut pas dépasser 254 caractères' })
      .trim()
      .optional()
      .nullable(),
  }),
});

// ==================== Schéma de liste avec recherche et pagination ====================
export const listRoleSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1').transform(
      (val) => parseInt(val, 10)).pipe(z.number().int().min(1)),
    limit: z.string().optional().default('20').transform(
      (val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)),
    search: z
      .string().trim().optional(),
    orderBy: z.enum(['libelle_role']).optional().default('libelle_role'),
    order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  }),
});

// ==================== Schéma de récupération d'un profil ====================
export const getRoleSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
});

// ==================== Schéma de mise à jour ====================
export const updateRoleSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
  body: z.object({
    libelle_role: z
      .string()
      .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
      .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
      .trim()
      .optional(),
    descr_role: z
      .string()
      .max(200, { message: 'La description ne peut pas dépasser 200 caractères' })
      .trim()
      .optional()
      .nullable(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Au moins un champ doit être fourni pour la mise à jour' }
  ),
});

// ==================== Schéma de suppression ====================
export const deleteRoleSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
});

// ==================== Types TypeScript ====================
export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type ListRolesInput = z.infer<typeof listRoleSchema>['query'];
export type GetRoleInput = z.infer<typeof getRoleSchema>['params'];
export type UpdateRoleInput = {
  params: z.infer<typeof updateRoleSchema>['params'];
  body: z.infer<typeof updateRoleSchema>['body'];
};
export type DeleteRoleInput = z.infer<typeof deleteRoleSchema>['params'];