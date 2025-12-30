import { z } from 'zod';

// ==================== Schéma de création ====================
export const createProfilSchema = z.object({
  body: z.object({
    libelle_profil: z
      .string()
      .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
      .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
      .trim(),
    descr_profil: z
      .string()
      .max(200, { message: 'La description ne peut pas dépasser 200 caractères' })
      .trim()
      .optional()
      .nullable(),
  }),
});

// ==================== Schéma de liste avec recherche et pagination ====================
export const listProfilsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1').transform(
      (val) => parseInt(val, 10)).pipe(z.number().int().min(1)),
    limit: z.string().optional().default('20').transform(
      (val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)),
    search: z
      .string().trim().optional(),
    orderBy: z.enum(['libelle_profil']).optional().default('libelle_profil'),
    order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  }),
});

// ==================== Schéma de récupération d'un profil ====================
export const getProfilSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
});

// ==================== Schéma de mise à jour ====================
export const updateProfilSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
  body: z.object({
    libelle_profil: z
      .string()
      .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
      .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
      .trim()
      .optional(),
    descr_profil: z
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
export const deleteProfilSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
});

// ==================== Types TypeScript ====================
export type CreateProfilInput = z.infer<typeof createProfilSchema>['body'];
export type ListProfilsInput = z.infer<typeof listProfilsSchema>['query'];
export type GetProfilInput = z.infer<typeof getProfilSchema>['params'];
export type UpdateProfilInput = {
  params: z.infer<typeof updateProfilSchema>['params'];
  body: z.infer<typeof updateProfilSchema>['body'];
};
export type DeleteProfilInput = z.infer<typeof deleteProfilSchema>['params'];