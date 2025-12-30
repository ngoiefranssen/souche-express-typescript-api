"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProfil = exports.updateProfil = exports.getProfil = exports.listProfils = exports.createProfil = void 0;
const errors_1 = require("../../utils/errors");
const db_1 = require("../../db/config/db");
// ==================== CRÉER UN PROFIL ====================
exports.createProfil = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { libelle_profil, descr_profil } = req.validated.body;
    try {
        // Vérifier si le profil existe déjà
        const checkQuery = 'SELECT id_profil FROM profils WHERE LOWER(libelle_profil) = LOWER($1)';
        const checkResult = await db_1.pool.query(checkQuery, [libelle_profil]);
        if (checkResult.rows.length > 0) {
            throw new errors_1.ConflictError('Un profil avec ce libellé existe déjà');
        }
        // Insérer le nouveau profil
        const insertQuery = `INSERT INTO profils (libelle_profil, descr_profil)
                VALUES ($1, $2)
                RETURNING id_profil, libelle_profil, descr_profil
                `;
        const result = await db_1.pool.query(insertQuery, [libelle_profil, descr_profil || null]);
        res.status(201).json({
            status: 'success',
            message: 'Profil créé avec succès',
            data: result.rows[0],
        });
    }
    catch (error) {
        if (error instanceof errors_1.ConflictError) {
            throw error;
        }
        if (error.code === '23505') {
            throw new errors_1.ConflictError('Un profil avec ce libellé existe déjà');
        }
        throw new errors_1.DatabaseError('Un profil avec ce libellé existe déjà');
    }
});
// ==================== LISTER LES PROFILS ====================
exports.listProfils = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const validatedReq = req;
    const queryData = validatedReq.validated?.query || req.query;
    const { page = 1, limit = 20, search, orderBy = 'libelle_profil', order = 'DESC', } = queryData;
    /* ----------  PAGINATION  ---------- */
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    /* ----------  TRI  –  protection injection + quotes  ---------- */
    const sanitizeId = (s) => String(s).replace(/["'`]/g, '').trim();
    const validOrderBy = [
        'libelle_profil',
        'descr_profil',
        'id_profil',
    ];
    const validOrder = ['ASC', 'DESC'];
    const rawOrderBy = sanitizeId(orderBy);
    const rawOrder = sanitizeId(order).toUpperCase();
    if (!validOrderBy.includes(rawOrderBy))
        throw new errors_1.ValidationError(`orderBy invalide : ${rawOrderBy}`);
    if (!validOrder.includes(rawOrder))
        throw new errors_1.ValidationError(`order invalide : ${rawOrder}`);
    const orderByField = rawOrderBy; // déjà validé
    const orderDirection = rawOrder; // déjà validé
    /* ----------  FILTRES  ---------- */
    const queryParams = [];
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
            db_1.pool.query(countQuery, queryParams),
            db_1.pool.query(dataQuery, [...queryParams, limitNum, offset]),
        ]);
        const total = parseInt(countRes.rows[0]?.total || '0', 10);
        const profils = dataRes.rows;
        const totalPages = Math.ceil(total / limitNum);
        if (total > 0 && pageNum > totalPages)
            throw new errors_1.ValidationError(`La page ${pageNum} n'existe pas (total pages : ${totalPages}).`);
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
    }
    catch (err) {
        console.error('=== ERREUR listProfils ===');
        console.error(err);
        if (err instanceof errors_1.ValidationError)
            throw err;
        throw new errors_1.DatabaseError(`Impossible de récupérer la liste des profils : ${err.message}`);
    }
});
// ==================== RÉCUPÉRER UN PROFIL ====================
exports.getProfil = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.validated?.params;
    try {
        const query = `
        SELECT 
          id_profil,
          libelle_profil,
          descr_profil
        FROM profils
        WHERE id_profil = $1
      `;
        const result = await db_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Profil non trouvé');
        }
        res.status(200).json({
            status: 'success',
            data: result.rows[0],
        });
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        throw new errors_1.DatabaseError('Impossible de récupérer le profil');
    }
});
// ==================== METTRE À JOUR UN PROFIL ====================
exports.updateProfil = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.validated.params;
    const { libelle_profil, descr_profil } = req.validated.body;
    try {
        // Vérifier si le profil existe
        const checkQuery = 'SELECT id_profil FROM profils WHERE id_profil = $1';
        const checkResult = await db_1.pool.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Profil non trouvé');
        }
        // Vérifier si le nouveau libellé n'existe pas déjà
        if (libelle_profil) {
            const duplicateQuery = `
                    SELECT id_profil FROM profils WHERE LOWER(libelle_profil) = LOWER($1) AND id_profil != $2`;
            const duplicateResult = await db_1.pool.query(duplicateQuery, [libelle_profil, id]);
            if (duplicateResult.rows.length > 0) {
                throw new errors_1.ConflictError('Un profil avec ce libellé existe déjà');
            }
        }
        // Construction dynamique de la requête de mise à jour
        const updates = [];
        const values = [];
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
        const result = await db_1.pool.query(updateQuery, values);
        res.status(200).json({
            status: 'success',
            message: 'Profil mis à jour avec succès',
            data: result.rows[0],
        });
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ConflictError) {
            throw error;
        }
        if (error.code === '23505') {
            throw new errors_1.ConflictError('Un profil avec ce libellé existe déjà');
        }
        throw new errors_1.DatabaseError('Un profil avec ce libellé existe déjà');
    }
});
// ==================== SUPPRIMER UN PROFIL ====================
exports.deleteProfil = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.validated.params;
    try {
        // Vérifier si le profil existe
        const checkQuery = 'SELECT id_profil FROM profils WHERE id_profil = $1';
        const checkResult = await db_1.pool.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            throw new errors_1.NotFoundError('Profil non trouvé');
        }
        // Vérifier si le profil est utilisé par des utilisateurs
        const usageQuery = 'SELECT COUNT(*) as count FROM users WHERE id_profil = $1';
        const usageResult = await db_1.pool.query(usageQuery, [id]);
        if (parseInt(usageResult.rows[0].count, 10) > 0) {
            throw new errors_1.ConflictError('Impossible de supprimer ce profil car il est utilisé par des utilisateurs');
        }
        // Supprimer le profil
        const deleteQuery = 'DELETE FROM profils WHERE id_profil = $1 RETURNING id_profil';
        await db_1.pool.query(deleteQuery, [id]);
        res.status(200).json({
            status: 'success',
            message: 'Profil supprimé avec succès',
        });
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ConflictError) {
            throw error;
        }
        if (error.code === '23503') {
            throw new errors_1.ConflictError('Impossible de supprimer ce profil car il est référencé par d\'autres données');
        }
        throw new errors_1.DatabaseError('Impossible de supprimer ce profil car il est référencé par d\'autres données');
    }
});
