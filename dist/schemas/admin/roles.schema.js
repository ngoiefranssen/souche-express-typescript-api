"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRolesSchema = exports.getRoleSchema = exports.updateRoleSchema = exports.createRoleSchema = void 0;
const zod_1 = require("zod");
// Schema de base pour un rôle
const roleBaseSchema = zod_1.z.object({
    libelle_role: zod_1.z.string().min(3, { message: 'Libellé requis (minimum 3 caractères)' }).max(100),
    descr_role: zod_1.z.string().max(200).optional().nullable(),
});
// === Création d'un rôle ===
exports.createRoleSchema = zod_1.z.object({
    body: roleBaseSchema,
});
// === Mise à jour d'un rôle ===
exports.updateRoleSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive({ message: 'ID du rôle invalide' })),
    }),
    body: roleBaseSchema.partial(), // Tous les champs sont optionnels en mise à jour
});
// === Récupération d'un rôle par ID (getOne) ===
exports.getRoleSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().positive({ message: 'ID du rôle invalide' })),
    }),
});
// === Liste des rôles avec pagination, recherche et tri ===
exports.listRolesSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().min(1)).optional().default(1),
        limit: zod_1.z.string().transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().min(1).max(100)).optional().default(20),
        search: zod_1.z.string().optional(), // Recherche sur libelle_role ou descr_role
        sort: zod_1.z.enum(['libelle_role', 'id_role', 'created_at']).optional().default('libelle_role'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
    }),
});
