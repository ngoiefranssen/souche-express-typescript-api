import { z } from 'zod';

// Schema de base pour un rôle
const roleBaseSchema = z.object({
  libelle_role: z.string().min(3, { message: 'Libellé requis (minimum 3 caractères)' }).max(100),
  descr_role: z.string().max(200).optional().nullable(),
});

// === Création d'un rôle ===
export const createRoleSchema = z.object({
  body: roleBaseSchema,
});

// === Mise à jour d'un rôle ===
export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive({ message: 'ID du rôle invalide' })),
  }),
  body: roleBaseSchema.partial(), // Tous les champs sont optionnels en mise à jour
});

// === Récupération d'un rôle par ID (getOne) ===
export const getRoleSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive({ message: 'ID du rôle invalide' })),
  }),
});

// === Liste des rôles avec pagination, recherche et tri ===
export const listRolesSchema = z.object({
  query: z.object({
    page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).optional().default(1),
    limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional().default(20),
    search: z.string().optional(), // Recherche sur libelle_role ou descr_role
    sort: z.enum(['libelle_role', 'id_role', 'created_at']).optional().default('libelle_role'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
});

// === Types exportés pour utilisation dans les controllers ===
export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateRoleParams = UpdateRoleInput['params'];
export type UpdateRoleBody = UpdateRoleInput['body'];
export type GetRoleInput = z.infer<typeof getRoleSchema>['params'];
export type ListRolesInput = z.infer<typeof listRolesSchema>['query'];