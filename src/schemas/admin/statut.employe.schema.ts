import { z } from 'zod';

// ==================== Schéma de création ====================
export const createStatuEmployeSchema = z.object({
  body: z.object({
    libelle_statut_employe: z
      .string()
      .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
      .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
      .trim(),
    descr_statut_employe: z
      .string()
      .max(200, { message: 'La description ne peut pas dépasser 200 caractères' })
      .trim()
      .optional()
      .nullable(),
  }),
});

// ==================== Schéma de liste avec recherche et pagination ====================
export const listStatuEmployeSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1').transform(
      (val) => parseInt(val, 10)).pipe(z.number().int().min(1)),
    limit: z.string().optional().default('20').transform(
      (val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)),
    search: z
      .string().trim().optional(),
    orderBy: z.enum(['libelle_statut_employe']).optional().default('libelle_statut_employe'),
    order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  }),
});

// ==================== Schéma de récupération d'un profil ====================
export const getStatuEmployeSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
});

// ==================== Schéma de mise à jour ====================
export const updatedStatuEmployeSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
  body: z.object({
    libelle_statut_employe: z
      .string()
      .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
      .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
      .trim()
      .optional(),
    descr_statut_employe: z
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
export const deleteStatuEmployeSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'ID invalide' })),
  }),
});

// ==================== Types TypeScript ====================
export type createStatuEmployeInput = z.infer<typeof createStatuEmployeSchema>['body'];
export type ListStatuEmployeInput = z.infer<typeof listStatuEmployeSchema>['query'];
export type GetStatuEmployeInput = z.infer<typeof getStatuEmployeSchema>['params'];
export type UpdatedStatuEmployeInput = {
  params: z.infer<typeof updatedStatuEmployeSchema>['params'];
  body: z.infer<typeof updatedStatuEmployeSchema>['body'];
};
export type DeleteStatuEmployeInput = z.infer<typeof deleteStatuEmployeSchema>['params'];