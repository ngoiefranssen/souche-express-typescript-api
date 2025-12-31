import { Request, Response, NextFunction } from 'express';
import { asyncHandler, ConflictError, DatabaseError, NotFoundError, ValidationError } from '../../utils/errors';
import { pool } from '../../db/config/db';
import { ValidatedRequest } from '../../middlewares/validation.middleware';
import { createStatuEmployeInput, DeleteStatuEmployeInput, GetStatuEmployeInput, ListStatuEmployeInput } from '../../schemas/admin/statut.employe.schema';


// ==================== CRÉER UN statut ====================
export const createStatutEmploye = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { libelle_statut_employe, descr_statut_employe }: createStatuEmployeInput = (req as ValidatedRequest).validated?.body;

        try {
            // Vérifier si le statut existe déjà
            const checkQuery = 'SELECT id_statut_employe FROM statut_employes WHERE LOWER(libelle_statut_employe) = LOWER($1)';
            const checkResult = await pool.query(checkQuery, [libelle_statut_employe]);

            if (checkResult.rows.length > 0) {
                throw new ConflictError('Un statut avec ce libellé existe déjà');
            }

            // Insérer le nouveau statut
            const insertQuery = `INSERT INTO statut_employes (libelle_statut_employe, descr_statut_employe)
                VALUES ($1, $2)
                RETURNING id_statut_employe, libelle_statut_employe, descr_statut_employe
                `;

            const result = await pool.query(insertQuery, [libelle_statut_employe, descr_statut_employe || null]);

            res.status(201).json({
                status: 'success',
                message: 'Statut créé avec succès',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23505') {
                throw new ConflictError('Un statut avec ce libellé existe déjà');
            }

            throw new DatabaseError('Un statut avec ce libellé existe déjà');
        }
    }
);

// ==================== LISTER LES statut_employes ====================
export const listStatutEmployes = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const validatedReq = req as ValidatedRequest;
        const queryData = validatedReq.validated?.query || req?.query;

        const {
            page = 1,
            limit = 20,
            search,
            orderBy = 'libelle_statut_employe',
            order = 'DESC',
        } = queryData as ListStatuEmployeInput;

        /* ----------  PAGINATION  ---------- */
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        /* ----------  TRI  –  protection injection + quotes  ---------- */
        const sanitizeId = (s: string) => String(s).replace(/["'`]/g, '').trim();

        const validOrderBy = [
            'libelle_statut_employe',
            'descr_statut_employe',
            'id_statut_employe',
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
            whereClause += ` AND (libelle_statut_employe ILIKE $${paramIdx} OR descr_statut_employe ILIKE $${paramIdx})`;
            queryParams.push(`%${search.trim()}%`);
            paramIdx++;
        }

        /* ----------  REQUÊTES  ---------- */
        const countQuery = `SELECT COUNT(*) AS total FROM public.statut_employes ${whereClause}`;

        const dataQuery = `
            SELECT id_statut_employe,
            libelle_statut_employe,
            descr_statut_employe
            FROM public.statut_employes ${whereClause} ORDER BY ${orderByField} ${orderDirection}
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
            `;

        try {
            const [countRes, dataRes] = await Promise.all([
                pool.query(countQuery, queryParams),
                pool.query(dataQuery, [...queryParams, limitNum, offset]),
            ]);

            const total = parseInt(countRes.rows[0]?.total || '0', 10);
            const statut_employes = dataRes.rows;

            const totalPages = Math.ceil(total / limitNum);

            if (total > 0 && pageNum > totalPages)
                throw new ValidationError(
                    `La page ${pageNum} n'existe pas (total pages : ${totalPages}).`
                );

            res.status(200).json({
                status: 'success',
                data: statut_employes,
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
                `Impossible de récupérer la liste des statut_employes : ${err.message}`
            );
        }
    }
);

// ==================== RÉCUPÉRER UN statut ====================
export const getStatutEmploye = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id }: GetStatuEmployeInput = (req as ValidatedRequest).validated?.params;

        try {
            const query = `
        SELECT 
          id_statut_employe,
          libelle_statut_employe,
          descr_statut_employe
        FROM statut_employes
        WHERE id_statut_employe = $1
      `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new NotFoundError('Statut non trouvé');
            }

            res.status(200).json({
                status: 'success',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError('Impossible de récupérer le statut');
        }
    }
);

// ==================== METTRE À JOUR UN statut ====================
export const updateStatuEmploye = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated.params;
        const { libelle_statut_employe, descr_statut_employe } = (req as ValidatedRequest).validated.body;

        try {
            // Vérifier si le statut existe
            const checkQuery = 'SELECT id_statut_employe FROM statut_employes WHERE id_statut_employe = $1';
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                throw new NotFoundError('statut non trouvé');
            }

            // Vérifier si le nouveau libellé n'existe pas déjà
            if (libelle_statut_employe) {
                const duplicateQuery = `
                    SELECT id_statut_employe FROM statut_employes WHERE LOWER(libelle_statut_employe) = LOWER($1) AND id_statut_employe != $2`;
                const duplicateResult = await pool.query(duplicateQuery, [libelle_statut_employe, id]);

                if (duplicateResult.rows.length > 0) {
                    throw new ConflictError('Un statut avec ce libellé existe déjà');
                }
            }

            // Construction dynamique de la requête de mise à jour
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (libelle_statut_employe !== undefined) {
                updates.push(`libelle_statut_employe = $${paramIndex}`);
                values.push(libelle_statut_employe);
                paramIndex++;
            }

            if (descr_statut_employe !== undefined) {
                updates.push(`descr_statut_employe = $${paramIndex}`);
                values.push(descr_statut_employe);
                paramIndex++;
            }

            values.push(id);

            const updateQuery = `
                UPDATE statut_employes SET ${updates.join(', ')} WHERE id_statut_employe = $${paramIndex}
                RETURNING id_statut_employe, libelle_statut_employe, descr_statut_employe
                `;

            const result = await pool.query(updateQuery, values);

            res.status(200).json({
                status: 'success',
                message: 'statut mis à jour avec succès',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23505') {
                throw new ConflictError('Un statut avec ce libellé existe déjà');
            }

            throw new DatabaseError('Un statut avec ce libellé existe déjà');
        }
    }
);

// ==================== SUPPRIMER UN statut ====================
export const deleteStatutEmploye = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id }: DeleteStatuEmployeInput = (req as ValidatedRequest).validated.params;

        try {
            // Vérifier si le statut existe
            const checkQuery = 'SELECT id_statut_employe FROM statut_employes WHERE id_statut_employe = $1';
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                throw new NotFoundError('statut non trouvé');
            }

            // Vérifier si le statut est utilisé par des utilisateurs
            const usageQuery = 'SELECT COUNT(*) as count FROM users WHERE id_statut_employe = $1';
            const usageResult = await pool.query(usageQuery, [id]);

            if (parseInt(usageResult.rows[0].count, 10) > 0) {
                throw new ConflictError(
                    'Impossible de supprimer ce statut car il est utilisé par des utilisateurs'
                );
            }

            // Supprimer le statut
            const deleteQuery = 'DELETE FROM statut_employes WHERE id_statut_employe = $1 RETURNING id_statut_employe';
            await pool.query(deleteQuery, [id]);

            res.status(200).json({
                status: 'success',
                message: 'statut supprimé avec succès',
            });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23503') {
                throw new ConflictError(
                    'Impossible de supprimer ce statut car il est référencé par d\'autres données'
                );
            }

            throw new DatabaseError('Impossible de supprimer ce statut car il est référencé par d\'autres données');
        }
    }
);