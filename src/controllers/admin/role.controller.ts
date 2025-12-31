import { Request, Response, NextFunction } from 'express';


import { asyncHandler, ConflictError, DatabaseError, NotFoundError, ValidationError } from '../../utils/errors';
import { pool } from '../../db/config/db';
import { ValidatedRequest } from '../../middlewares/validation.middleware';
import { CreateRoleInput, DeleteRoleInput, GetRoleInput, ListRolesInput } from '../../schemas/admin/roles.schema';



// ==================== CRÉER UN ROLE ====================
export const createRole = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { libelle_role, descr_role }: CreateRoleInput = (req as ValidatedRequest).validated.body;

        try {
            // Vérifier si le role existe déjà
            const checkQuery = 'SELECT id_role FROM roles WHERE LOWER(libelle_role) = LOWER($1)';
            const checkResult = await pool.query(checkQuery, [libelle_role]);

            if (checkResult.rows.length > 0) {
                throw new ConflictError('Un role avec ce libellé existe déjà');
            }

            // Insérer le nouveau role
            const insertQuery = `INSERT INTO roles (libelle_role, descr_role)
                VALUES ($1, $2)
                RETURNING id_role, libelle_role, descr_role
                `;

            const result = await pool.query(insertQuery, [libelle_role, descr_role || null]);

            res.status(201).json({
                status: 'success',
                message: 'role créé avec succès',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23505') {
                throw new ConflictError('Un role avec ce libellé existe déjà');
            }

            throw new DatabaseError('Un role avec ce libellé existe déjà');
        }
    }
);

// ==================== LISTER LES ROLES ====================
export const listRoles = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const validatedReq = req as ValidatedRequest;
        const queryData = validatedReq.validated?.query || req?.query;

        const {
            page = 1,
            limit = 20,
            search,
            orderBy = 'libelle_role',
            order = 'DESC',
        } = queryData as ListRolesInput;

        /* ----------  PAGINATION  ---------- */
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        /* ----------  TRI  –  protection injection + quotes  ---------- */
        const sanitizeId = (s: string) => String(s).replace(/["'`]/g, '').trim();

        const validOrderBy = [
            'libelle_role',
            'descr_role',
            'id_role',
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
            whereClause += ` AND (libelle_role ILIKE $${paramIdx} OR descr_role ILIKE $${paramIdx})`;
            queryParams.push(`%${search.trim()}%`);
            paramIdx++;
        }

        /* ----------  REQUÊTES  ---------- */
        const countQuery = `SELECT COUNT(*) AS total FROM public.roles ${whereClause}`;

        const dataQuery = `
            SELECT id_role,
            libelle_role,
            descr_role
            FROM public.roles ${whereClause} ORDER BY ${orderByField} ${orderDirection}
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
            `;

        try {
            const [countRes, dataRes] = await Promise.all([
                pool.query(countQuery, queryParams),
                pool.query(dataQuery, [...queryParams, limitNum, offset]),
            ]);

            const total = parseInt(countRes.rows[0]?.total || '0', 10);
            const roles = dataRes.rows;

            const totalPages = Math.ceil(total / limitNum);

            if (total > 0 && pageNum > totalPages)
                throw new ValidationError(
                    `La page ${pageNum} n'existe pas (total pages : ${totalPages}).`
                );

            res.status(200).json({
                status: 'success',
                data: roles,
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
                `Impossible de récupérer la liste des roles : ${err.message}`
            );
        }
    }
);

// ==================== RÉCUPÉRER UN ROLE ====================
export const getRole = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id }: GetRoleInput = (req as ValidatedRequest).validated?.params;

        try {
            const query = `
        SELECT 
          id_role,
          libelle_role,
          descr_role
        FROM roles
        WHERE id_role = $1
      `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new NotFoundError('Role non trouvé');
            }

            res.status(200).json({
                status: 'success',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError('Impossible de récupérer le role');
        }
    }
);

// ==================== METTRE À JOUR UN ROLE ====================
export const updateRole = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated?.params;
        const { libelle_role, descr_role } = (req as ValidatedRequest).validated?.body;

        try {
            // Vérifier si le role existe
            const checkQuery = 'SELECT id_role FROM roles WHERE id_role = $1';
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                throw new NotFoundError('role non trouvé');
            }

            // Vérifier si le nouveau libellé n'existe pas déjà
            if (libelle_role) {
                const duplicateQuery = `
                    SELECT id_role FROM roles WHERE LOWER(libelle_role) = LOWER($1) AND id_role != $2`;
                const duplicateResult = await pool.query(duplicateQuery, [libelle_role, id]);

                if (duplicateResult.rows.length > 0) {
                    throw new ConflictError('Un role avec ce libellé existe déjà');
                }
            }

            // Construction dynamique de la requête de mise à jour
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (libelle_role !== undefined) {
                updates.push(`libelle_role = $${paramIndex}`);
                values.push(libelle_role);
                paramIndex++;
            }

            if (descr_role !== undefined) {
                updates.push(`descr_role = $${paramIndex}`);
                values.push(descr_role);
                paramIndex++;
            }

            values.push(id);

            const updateQuery = `
                UPDATE roles SET ${updates.join(', ')} WHERE id_role = $${paramIndex}
                RETURNING id_role, libelle_role, descr_role
                `;

            const result = await pool.query(updateQuery, values);

            res.status(200).json({
                status: 'success',
                message: 'role mis à jour avec succès',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error instanceof NotFoundError || error instanceof ConflictError) {
                throw error;
            }

            if (error.code === '23505') {
                throw new ConflictError('Un role avec ce libellé existe déjà');
            }

            throw new DatabaseError('Un role avec ce libellé existe déjà');
        }
    }
);

// ==================== SUPPRIMER UN ROLE ====================
export const deleteRole = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id }: DeleteRoleInput = (req as ValidatedRequest).validated.params;

        // Vérifier si le role existe
        const checkQuery = 'SELECT id_role FROM roles WHERE id_role = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            throw new NotFoundError('role non trouvé');
        }

        // Vérifier si le role est utilisé par des utilisateurs
        const usageQuery = 'SELECT COUNT(*) as count FROM profils_roles WHERE id_role = $1';
        const usageResult = await pool.query(usageQuery, [id]);

        if (parseInt(usageResult.rows[0].count, 10) > 0) {
            throw new ConflictError(
                'Impossible de supprimer ce role car il est utilisé par des utilisateurs'
            );
        }

        try {
            // Supprimer le role
            const deleteQuery = 'DELETE FROM roles WHERE id_role = $1 RETURNING id_role';
            await pool.query(deleteQuery, [id]);

            res.status(200).json({
                status: 'success',
                message: 'role supprimé avec succès',
            });
        } catch (error: any) {
            // Gérer uniquement les erreurs de contrainte de clé étrangère
            if (error.code === '23503') {
                throw new ConflictError(
                    'Impossible de supprimer ce role car il est référencé par d\'autres données'
                );
            }
            
            // Relancer l'erreur pour qu'elle soit gérée par asyncHandler
            throw error;
        }
    }
);