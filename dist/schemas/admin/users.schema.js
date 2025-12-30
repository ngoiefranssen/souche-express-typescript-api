"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserSchema = exports.listUsersSchema = exports.getUserSchema = exports.updateUserSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Schema de base commun à Create et Update
const userBaseSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: 'Email invalide' }).optional(),
    nom_user: zod_1.z.string().min(2, { message: 'Nom : 2 caractères minimum' }),
    prenom_user: zod_1.z.string().min(2, { message: 'Prénom : 2 caractères minimum' }),
    telephone: zod_1.z.string().max(20, { message: 'Téléphone : maximum 20 caractères' }).optional().nullable(),
    photo_profile: zod_1.z.string().url({ message: 'URL de photo invalide' }).optional().nullable(),
    salaire: zod_1.z.number().min(0, { message: 'Salaire doit être positif' }).optional().nullable(),
    date_embauche: zod_1.z.string().date({ message: 'Date invalide (format YYYY-MM-DD)' }).optional().nullable(),
    id_statut_employe: zod_1.z.number().int().positive({ message: 'Statut employé invalide' }).optional().nullable(),
    id_profil: zod_1.z.number().int().positive({ message: 'Profil invalide' }).optional().nullable(), // ← NOUVEAU
});
// Schema pour l'inscription (Register) - mot de passe obligatoire
exports.registerSchema = zod_1.z.object({
    body: userBaseSchema.extend({
        email: zod_1.z.string().email({ message: 'Email invalide' }),
        password: zod_1.z.string().min(8, { message: 'Mot de passe : 8 caractères minimum' }),
        // Rendre id_profil obligatoire lors de l'inscription si besoin
        id_profil: zod_1.z.number().int().positive(),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive({ message: 'ID utilisateur invalide' })),
    }),
    body: userBaseSchema.partial().extend({
        password: zod_1.z.string().min(8).optional(),
    }),
});
exports.getUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive({ message: 'ID utilisateur invalide' })),
    }),
});
exports.listUsersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().min(1)).optional().default(1),
        limit: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().min(1).max(100)).optional().default(20),
        search: zod_1.z.string().optional(),
        statut: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive()).optional(),
        profil: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive()).optional(), // ← Nouveau filtre par profil
    }),
});
// Schema pour supprimer un utilisateur (Delete)  même validation que getUser
exports.deleteUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive({ message: 'ID utilisateur invalide' })),
    }),
});
