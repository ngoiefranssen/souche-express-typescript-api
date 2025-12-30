import { z } from 'zod';

// Schema de base commun à Create et Update
const userBaseSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }).optional(),
  nom_user: z.string().min(2, { message: 'Nom : 2 caractères minimum' }),
  prenom_user: z.string().min(2, { message: 'Prénom : 2 caractères minimum' }),
  telephone: z.string().max(20, { message: 'Téléphone : maximum 20 caractères' }).optional().nullable(),
  photo_profile: z.string().url({ message: 'URL de photo invalide' }).optional().nullable(),
  salaire: z.number().min(0, { message: 'Salaire doit être positif' }).optional().nullable(),
  date_embauche: z.string().date({ message: 'Date invalide (format YYYY-MM-DD)' }).optional().nullable(),
  id_statut_employe: z.number().int().positive({ message: 'Statut employé invalide' }).optional().nullable(),
  id_profil: z.number().int().positive({ message: 'Profil invalide' }).optional().nullable(), // ← NOUVEAU
});

// Schema pour l'inscription (Register) - mot de passe obligatoire
export const registerSchema = z.object({
  body: userBaseSchema.extend({
    email: z.string().email({ message: 'Email invalide' }),
    password: z.string().min(8, { message: 'Mot de passe : 8 caractères minimum' }),
    // Rendre id_profil obligatoire lors de l'inscription si besoin
    id_profil: z.number().int().positive(),
  }),
});


export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive({ message: 'ID utilisateur invalide' })),
  }),
  body: userBaseSchema.partial().extend({
    password: z.string().min(8).optional(),
  }),
});

export const getUserSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive({ message: 'ID utilisateur invalide' })),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).optional().default(1),
    limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional().default(20),
    search: z.string().optional(),
    statut: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).optional(),
    profil: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).optional(), // ← Nouveau filtre par profil
  }),
});

// Schema pour supprimer un utilisateur (Delete)  même validation que getUser
export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive({ message: 'ID utilisateur invalide' })),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserParams = UpdateUserInput['params'];
export type UpdateUserBody = UpdateUserInput['body'];
export type GetUserInput = z.infer<typeof getUserSchema>['params'];
export type ListUsersInput = z.infer<typeof listUsersSchema>['query'];
export type DeleteUserInput = z.infer<typeof deleteUserSchema>['params'];