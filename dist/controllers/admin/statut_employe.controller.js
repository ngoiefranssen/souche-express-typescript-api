"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStatutEmploye = exports.updateStatuEmploye = exports.getStatutEmploye = exports.listStatutEmployes = exports.createStatutEmploye = void 0;
const errors_1 = require("../../utils/errors");
const db_1 = require("../../db/config/db");
// ==================== CRÉER UN statut ====================
exports.createStatutEmploye = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { libelle_statut_employe, descr_statut_employe } = req.validated.body;
    try {
        // Vérifier si le statut existe déjà
        const checkQuery = 'SELECT id_statut_employe FROM statut_employes WHERE LOWER(libelle_statut_employe) = LOWER($1)';
        const checkResult = await db_1.pool.query(checkQuery, [libelle_statut_employe]);
        if (checkResult.rows.length > 0) {
            throw new errors_1.ConflictError('Un statut avec ce libellé existe déjà');
        }
        // Insérer le nouveau statut
        const insertQuery = `INSERT INTO statut_employes (libelle_statut_employe, descr_statut_employe)
                VALUES ($1, $2)
                RETURNING id_statut_employe, libelle_statut_employe, descr_statut_employe
                `;
        const result = await db_1.pool.query(insertQuery, [libelle_statut_employe, descr_statut_employe || null]);
        res.status(201).json({
            status: 'success',
            message: 'Statut créé avec succès',
            data: result.rows[0],
        });
    }
    catch (error) {
        if (error instanceof errors_1.ConflictError) {
            throw error;
        }
        if (error.code === '23505') {
            throw new errors_1.ConflictError('Un statut avec ce libellé existe déjà');
        }
        throw new errors_1.DatabaseError('Un statut avec ce libellé existe déjà');
    }
});
// ==================== LISTER LES statut_employes ====================
exports.listStatutEmployes = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const validatedReq = req;
    const queryData = validatedReq.validated?.query || req.query;
    const { page = 1, limit = 20, search, orderBy = 'libelle_statut_employe', order = 'DESC', } = queryData;
    /* ----------  PAGINATION  ---------- */
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    /* ----------  TRI  –  protection injection + quotes  ---------- */
    const sanitizeId = (s) => String(s).replace(/["'`]/g, '').trim();
    const validOrderBy = [
        'libelle_statut_employe',
        'descr_statut_employe',
        'id_statut_employe',
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
            db_1.pool.query(countQuery, queryParams),
            db_1.pool.query(dataQuery, [...queryParams, limitNum, offset]),
        ]);
        const total = parseInt(countRes.rows[0]?.total || '0', 10);
        const statut_employes = dataRes.rows;
        const totalPages = Math.ceil(total / limitNum);
        if (total > 0 && pageNum > totalPages)
            throw new errors_1.ValidationError(`La page ${pageNum} n'existe pas (total pages : ${totalPages}).`);
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
    }
    catch (err) {
        if (err instanceof errors_1.ValidationError)
            throw err;
        throw new errors_1.DatabaseError(`Impossible de récupérer la liste des statut_employes : ${err.message}`);
    }
});
// ==================== RÉCUPÉRER UN statut ====================
exports.getStatutEmploye = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.validated?.params;
    try {
        const query = `
        SELECT 
          id_statut_employe,
          libelle_statut_employe,
          descr_statut_employe
        FROM statut_employes
        WHERE id_statut_employe = $1
      `;
        const result = await db_1.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Statut non trouvé');
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
        throw new errors_1.DatabaseError('Impossible de récupérer le statut');
    }
});
// ==================== METTRE À JOUR UN statut ====================
exports.updateStatuEmploye = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.validated.params;
    const { libelle_statut_employe, descr_statut_employe } = req.validated.body;
    try {
        // Vérifier si le statut existe
        const checkQuery = 'SELECT id_statut_employe FROM statut_employes WHERE id_statut_employe = $1';
        const checkResult = await db_1.pool.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            throw new errors_1.NotFoundError('statut non trouvé');
        }
        // Vérifier si le nouveau libellé n'existe pas déjà
        if (libelle_statut_employe) {
            const duplicateQuery = `
                    SELECT id_statut_employe FROM statut_employes WHERE LOWER(libelle_statut_employe) = LOWER($1) AND id_statut_employe != $2`;
            const duplicateResult = await db_1.pool.query(duplicateQuery, [libelle_statut_employe, id]);
            if (duplicateResult.rows.length > 0) {
                throw new errors_1.ConflictError('Un statut avec ce libellé existe déjà');
            }
        }
        // Construction dynamique de la requête de mise à jour
        const updates = [];
        const values = [];
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
        const result = await db_1.pool.query(updateQuery, values);
        res.status(200).json({
            status: 'success',
            message: 'statut mis à jour avec succès',
            data: result.rows[0],
        });
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ConflictError) {
            throw error;
        }
        if (error.code === '23505') {
            throw new errors_1.ConflictError('Un statut avec ce libellé existe déjà');
        }
        throw new errors_1.DatabaseError('Un statut avec ce libellé existe déjà');
    }
});
// ==================== SUPPRIMER UN statut ====================
exports.deleteStatutEmploye = (0, errors_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.validated.params;
    try {
        // Vérifier si le statut existe
        const checkQuery = 'SELECT id_statut_employe FROM statut_employes WHERE id_statut_employe = $1';
        const checkResult = await db_1.pool.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            throw new errors_1.NotFoundError('statut non trouvé');
        }
        // Vérifier si le statut est utilisé par des utilisateurs
        const usageQuery = 'SELECT COUNT(*) as count FROM users WHERE id_statut_employe = $1';
        const usageResult = await db_1.pool.query(usageQuery, [id]);
        if (parseInt(usageResult.rows[0].count, 10) > 0) {
            throw new errors_1.ConflictError('Impossible de supprimer ce statut car il est utilisé par des utilisateurs');
        }
        // Supprimer le statut
        const deleteQuery = 'DELETE FROM statut_employes WHERE id_statut_employe = $1 RETURNING id_statut_employe';
        await db_1.pool.query(deleteQuery, [id]);
        res.status(200).json({
            status: 'success',
            message: 'statut supprimé avec succès',
        });
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ConflictError) {
            throw error;
        }
        if (error.code === '23503') {
            throw new errors_1.ConflictError('Impossible de supprimer ce statut car il est référencé par d\'autres données');
        }
        throw new errors_1.DatabaseError('Impossible de supprimer ce statut car il est référencé par d\'autres données');
    }
});
