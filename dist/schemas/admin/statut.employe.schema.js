"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStatuEmployeSchema = exports.updatedStatuEmployeSchema = exports.getStatuEmployeSchema = exports.listStatuEmployeSchema = exports.createStatuEmployeSchema = void 0;
const zod_1 = require("zod");
// ==================== Schéma de création ====================
exports.createStatuEmployeSchema = zod_1.z.object({
    body: zod_1.z.object({
        libelle_statut_employe: zod_1.z
            .string()
            .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
            .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
            .trim(),
        descr_statut_employe: zod_1.z
            .string()
            .max(200, { message: 'La description ne peut pas dépasser 200 caractères' })
            .trim()
            .optional()
            .nullable(),
    }),
});
// ==================== Schéma de liste avec recherche et pagination ====================
exports.listStatuEmployeSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1').transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().min(1)),
        limit: zod_1.z.string().optional().default('20').transform((val) => parseInt(val, 10)).pipe(zod_1.z.number().int().min(1).max(100)),
        search: zod_1.z
            .string().trim().optional(),
        orderBy: zod_1.z.enum(['libelle_statut_employe']).optional().default('libelle_statut_employe'),
        order: zod_1.z.enum(['ASC', 'DESC']).optional().default('DESC'),
    }),
});
// ==================== Schéma de récupération d'un profil ====================
exports.getStatuEmployeSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(zod_1.z.number().int().positive({ message: 'ID invalide' })),
    }),
});
// ==================== Schéma de mise à jour ====================
exports.updatedStatuEmployeSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(zod_1.z.number().int().positive({ message: 'ID invalide' })),
    }),
    body: zod_1.z.object({
        libelle_statut_employe: zod_1.z
            .string()
            .min(3, { message: 'Le libellé doit contenir au moins 3 caractères' })
            .max(100, { message: 'Le libellé ne peut pas dépasser 100 caractères' })
            .trim()
            .optional(),
        descr_statut_employe: zod_1.z
            .string()
            .max(200, { message: 'La description ne peut pas dépasser 200 caractères' })
            .trim()
            .optional()
            .nullable(),
    }).refine((data) => Object.keys(data).length > 0, { message: 'Au moins un champ doit être fourni pour la mise à jour' }),
});
// ==================== Schéma de suppression ====================
exports.deleteStatuEmployeSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(zod_1.z.number().int().positive({ message: 'ID invalide' })),
    }),
});
