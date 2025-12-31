import { Request, Response, NextFunction } from 'express';

import {
    CreateProfilInput,
    ListProfilsInput,
    GetProfilInput,
    DeleteProfilInput,
} from '../../schemas/admin/profils.schema';
import { asyncHandler, ConflictError, DatabaseError, NotFoundError, ValidationError } from '../../utils/errors';
import { pool } from '../../db/config/db';
import { ValidatedRequest } from '../../middlewares/validation.middleware';



// ==================== CRÉER UN PROFIL ====================
export const createProfil = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { libelle_profil, descr_profil }: CreateProfilInput = (req as ValidatedRequest).validated.body;

        try {
            // Vérifier si le profil existe déjà
            const checkQuery = 'SELECT id_profil FROM profils WHERE LOWER(libelle_profil) = LOWER($1)';
            const checkResult = await pool.query(checkQuery, [libelle_profil]);

            if (checkResult.rows.length > 0) {
                throw new ConflictError('Un profil avec ce libellé existe déjà');
            }

            // Insérer le nouveau profil
            const insertQuery = `INSERT INTO profils (libelle_profil, descr_profil)
                VALUES ($1, $2)
                RETURNING id_profil, libelle_profil, descr_profil
                `;

            const result = await pool.query(insertQuery, [libelle_profil, descr_profil || null]);

            res.status(201).json({
                status: 'success',
                message: 'Profil créé avec succès',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23505') {
                throw new ConflictError('Un profil avec ce libellé existe déjà');
            }

            throw new DatabaseError('Un profil avec ce libellé existe déjà');
        }
    }
);

// ==================== LISTER LES PROFILS ====================
export const listProfils = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const validatedReq = req as ValidatedRequest;
        const queryData = validatedReq.validated?.query || req.query;

        const {
            page = 1,
            limit = 20,
            search,
            orderBy = 'libelle_profil',
            order = 'DESC',
        } = queryData as ListProfilsInput;

        /* ----------  PAGINATION  ---------- */
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        /* ----------  TRI  –  protection injection + quotes  ---------- */
        const sanitizeId = (s: string) => String(s).replace(/["'`]/g, '').trim();

        const validOrderBy = [
            'libelle_profil',
            'descr_profil',
            'id_profil',
        ] as const;
        const validOrder = ['ASC', 'DESC'] as const;

        const rawOrderBy = sanitizeId(orderBy as string);
        const rawOrder = sanitizeId(order as string).toUpperCase();

        if (!validOrderBy.includes(rawOrderBy as any))
            throw new ValidationError(`orderBy invalide : ${rawOrderBy}`);
        if (!validOrder.includes(rawOrder as any))
            throw new ValidationError(`order invalide : ${rawOrder}`);

        const orderByField = rawOrderBy; // déjà validé
        const orderDirection = rawOrder; // déjà validé

        /* ----------  FILTRES  ---------- */
        const queryParams: any[] = [];
        let paramIdx = 1;
        let whereClause = 'WHERE 1=1';

        if (search?.trim()) {
            whereClause += ` AND (libelle_profil ILIKE $${paramIdx} OR descr_profil ILIKE $${paramIdx})`;
            queryParams.push(`%${search.trim()}%`);
            paramIdx++;
        }

        /* ----------  REQUÊTES  ---------- */
        const countQuery = `SELECT COUNT(*) AS total FROM public.profils ${whereClause}`;

        const dataQuery = `
            SELECT id_profil,
            libelle_profil,
            descr_profil
            FROM public.profils ${whereClause} ORDER BY ${orderByField} ${orderDirection}
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
            `;

        try {
            const [countRes, dataRes] = await Promise.all([
                pool.query(countQuery, queryParams),
                pool.query(dataQuery, [...queryParams, limitNum, offset]),
            ]);

            const total = parseInt(countRes.rows[0]?.total || '0', 10);
            const profils = dataRes.rows;

            const totalPages = Math.ceil(total / limitNum);

            if (total > 0 && pageNum > totalPages)
                throw new ValidationError(
                    `La page ${pageNum} n'existe pas (total pages : ${totalPages}).`
                );

            res.status(200).json({
                status: 'success',
                data: profils,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                },
                filters: {
                    ...(search && { search }),
                    orderBy: orderByField,
                    order: orderDirection,
                },
            });
        } catch (err: any) {
            if (err instanceof ValidationError) throw err;
            throw new DatabaseError(
                `Impossible de récupérer la liste des profils : ${err.message}`
            );
        }
    }
);

// ==================== RÉCUPÉRER UN PROFIL ====================
export const getProfil = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id }: GetProfilInput = (req as ValidatedRequest).validated?.params;

        try {
            const query = `
        SELECT 
          id_profil,
          libelle_profil,
          descr_profil
        FROM profils
        WHERE id_profil = $1
      `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new NotFoundError('Profil non trouvé');
            }

            res.status(200).json({
                status: 'success',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError('Impossible de récupérer le profil');
        }
    }
);

// ==================== METTRE À JOUR UN PROFIL ====================
export const updateProfil = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated.params;
        const { libelle_profil, descr_profil } = (req as ValidatedRequest).validated.body;

        try {
            // Vérifier si le profil existe
            const checkQuery = 'SELECT id_profil FROM profils WHERE id_profil = $1';
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                throw new NotFoundError('Profil non trouvé');
            }

            // Vérifier si le nouveau libellé n'existe pas déjà
            if (libelle_profil) {
                const duplicateQuery = `
                    SELECT id_profil FROM profils WHERE LOWER(libelle_profil) = LOWER($1) AND id_profil != $2`;
                const duplicateResult = await pool.query(duplicateQuery, [libelle_profil, id]);

                if (duplicateResult.rows.length > 0) {
                    throw new ConflictError('Un profil avec ce libellé existe déjà');
                }
            }

            // Construction dynamique de la requête de mise à jour
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (libelle_profil !== undefined) {
                updates.push(`libelle_profil = $${paramIndex}`);
                values.push(libelle_profil);
                paramIndex++;
            }

            if (descr_profil !== undefined) {
                updates.push(`descr_profil = $${paramIndex}`);
                values.push(descr_profil);
                paramIndex++;
            }

            values.push(id);

            const updateQuery = `
                UPDATE profils SET ${updates.join(', ')} WHERE id_profil = $${paramIndex}
                RETURNING id_profil, libelle_profil, descr_profil
                `;

            const result = await pool.query(updateQuery, values);

            res.status(200).json({
                status: 'success',
                message: 'Profil mis à jour avec succès',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23505') {
                throw new ConflictError('Un profil avec ce libellé existe déjà');
            }

            throw new DatabaseError('Un profil avec ce libellé existe déjà');
        }
    }
);

// ==================== SUPPRIMER UN PROFIL ====================
export const deleteProfil = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id }: DeleteProfilInput = (req as ValidatedRequest).validated.params;

        try {
            // Vérifier si le profil existe
            const checkQuery = 'SELECT id_profil FROM profils WHERE id_profil = $1';
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                throw new NotFoundError('Profil non trouvé');
            }

            // Vérifier si le profil est utilisé par des utilisateurs
            const usageQuery = 'SELECT COUNT(*) as count FROM users WHERE id_profil = $1';
            const usageResult = await pool.query(usageQuery, [id]);

            if (parseInt(usageResult.rows[0].count, 10) > 0) {
                throw new ConflictError(
                    'Impossible de supprimer ce profil car il est utilisé par des utilisateurs'
                );
            }

            // Supprimer le profil
            const deleteQuery = 'DELETE FROM profils WHERE id_profil = $1 RETURNING id_profil';
            await pool.query(deleteQuery, [id]);

            res.status(200).json({
                status: 'success',
                message: 'Profil supprimé avec succès',
            });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23503') {
                throw new ConflictError(
                    'Impossible de supprimer ce profil car il est référencé par d\'autres données'
                );
            }

            throw new DatabaseError('Impossible de supprimer ce profil car il est référencé par d\'autres données');
        }
    }
);