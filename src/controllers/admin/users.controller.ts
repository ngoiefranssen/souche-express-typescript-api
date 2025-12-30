import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';

import {
    RegisterInput,
    UpdateUserBody,
    UpdateUserParams,
    GetUserInput,
    ListUsersInput,
} from '../../schemas/admin/users.schema';
import { pool } from '../../db/config/db';
import { asyncHandler, DatabaseError, ValidationError } from '../../utils/errors';



// ============================ REGISTER ============================
export const registerUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            email,
            password,
            nom_user,
            prenom_user,
            telephone,
            photo_profile,
            salaire,
            date_embauche,
            id_statut_employe,
            id_profil,
        }: RegisterInput = (req as any).validated.body;

        const { rows: existing } = await pool.query(
            'SELECT id_user FROM users WHERE email = $1',
            [email]
        );

        if (existing.length > 0) {
            res.status(409).json({ message: 'Cet email est déjà utilisé' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const { rows } = await pool.query(
            `INSERT INTO users (
        email, password_hash, nom_user, prenom_user, telephone,
        photo_profile, salaire, date_embauche, id_statut_employe, id_profil
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id_user, email, nom_user, prenom_user, photo_profile, id_profil`,
            [
                email,
                passwordHash,
                nom_user,
                prenom_user,
                telephone ?? null,
                photo_profile ?? null,
                salaire ?? null,
                date_embauche ?? null,
                id_statut_employe ?? null,
                id_profil ?? null,
            ]
        );

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: rows[0],
        });
    } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'users_email_key') {
            res.status(409).json({ message: 'Cet email est déjà utilisé' });
            return;
        }
        next(error);
    }
};

// ============================ GET ONE ============================
export const getUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id }: GetUserInput = (req as any).validated.params;

        const { rows } = await pool.query(
            `SELECT 
        u.id_user, u.email, u.nom_user, u.prenom_user, u.telephone, u.photo_profile,
        u.salaire, u.date_embauche, u.id_statut_employe, se.libelle_statut_employe,
        u.id_profil, p.libelle_profil, p.descr_profil,
        json_agg(json_build_object(
          'id_role', r.id_role,
          'libelle_role', r.libelle_role,
          'descr_role', r.descr_role
        )) AS roles
      FROM users u
      LEFT JOIN statut_employes se ON u.id_statut_employe = se.id_statut_employe
      LEFT JOIN profils p ON u.id_profil = p.id_profil
      LEFT JOIN profils_roles pr ON p.id_profil = pr.id_profil
      LEFT JOIN roles r ON pr.id_role = r.id_role
      WHERE u.id_user = $1
      GROUP BY u.id_user, se.libelle_statut_employe, p.id_profil`,
            [id]
        );

        if (rows.length === 0) {
            res.status(409).json({ message: 'Cet email est déjà utilisé' });
            return;
        }

        const user = rows[0];
        user.roles = user.roles[0] === null ? [] : user.roles;

        res.json(user);
    } catch (error) {
        next(error);
    }
};

// ============================ LIST ============================
export const listUsers = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Récupération des paramètres validés par Zod
    const {
      page = 1,
      limit = 20,
      search,
      statut,
      profil,
    }: ListUsersInput = (req as any).validated.query;
    
    // Calcul de l'offset
    const offset = (page - 1) * limit;

    // Construction dynamique de la requête SQL
    const queryParams: any[] = [];
    let paramIndex = 1;
    let whereClause = 'WHERE 1=1';

    // Filtre de recherche
    if (search && search.trim() !== '') {
      whereClause += ` AND (
        u.email ILIKE $${paramIndex} 
        OR u.nom_user ILIKE $${paramIndex} 
        OR u.prenom_user ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Filtre par statut
    if (statut !== undefined && statut !== null) {
      whereClause += ` AND u.id_statut_employe = $${paramIndex}`;
      queryParams.push(statut);
      paramIndex++;
    }

    // Filtre par profil
    if (profil !== undefined && profil !== null) {
      whereClause += ` AND u.id_profil = $${paramIndex}`;
      queryParams.push(profil);
      paramIndex++;
    }

    // Requête pour compter le total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      ${whereClause}
    `;

    // Requête pour récupérer les données
    const dataQuery = `
      SELECT 
        u.id_user,
        u.email,
        u.nom_user,
        u.prenom_user,
        u.telephone,
        u.photo_profile,
        u.id_profil,
        p.libelle_profil,
        u.id_statut_employe,
        se.libelle_statut_employe,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN profils p ON u.id_profil = p.id_profil
      LEFT JOIN statut_employes se ON u.id_statut_employe = se.id_statut_employe
      ${whereClause}
      ORDER BY u.nom_user ASC, u.prenom_user ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      // Paramètres pour la requête de comptage (sans limit et offset)
      const countParams = [...queryParams];
      
      // Paramètres pour la requête de données (avec limit et offset)
      const dataParams = [...queryParams, limit, offset];

      // Exécution parallèle des deux requêtes
      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, countParams),
        pool.query(dataQuery, dataParams),
      ]);

      const total = parseInt(countResult.rows[0]?.total || '0', 10);
      const users = dataResult.rows;

      // Calcul du nombre total de pages
      const totalPages = Math.ceil(total / limit);

      // Vérification si la page demandée existe
      if (page > totalPages && totalPages > 0) {
        throw new ValidationError(
          `La page ${page} n'existe pas. Nombre total de pages : ${totalPages}`
        );
      }

      // Réponse avec succès
      res.status(200).json({
        status: 'success',
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          ...(search && { search }),
          ...(statut !== undefined && { statut }),
          ...(profil !== undefined && { profil }),
        },
      });
    } catch (error: any) {
      // Si c'est déjà une AppError, on la relance
      if (error instanceof ValidationError) {
        throw error;
      }

      // Log de l'erreur pour le debug
      console.error('Erreur lors de la récupération des utilisateurs:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
      });

      // Gestion des erreurs PostgreSQL spécifiques
      if (error.code === '42P01') {
        throw new DatabaseError('Table utilisateurs introuvable dans la base de données');
      }

      if (error.code === '42703') {
        throw new DatabaseError('Erreur de structure de la base de données');
      }

      // Erreur de connexion
      if (error.code === '08006' || error.code === '08003') {
        throw new DatabaseError('Impossible de se connecter à la base de données');
      }

      // Erreur générique de base de données
      throw new DatabaseError('Impossible de récupérer la liste des utilisateurs');
    }
  }
);

// ============================ UPDATE ============================
export const updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id }: UpdateUserParams = (req as any).validated.params;
        const body: UpdateUserBody = (req as any).validated.body;

        const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id_user = $1', [id]);
        if (rowCount === 0) {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
            return;
        }

        const updates: string[] = [];
        const values: any[] = [];
        let index = 1;

        if (body.email !== undefined) { updates.push(`email = $${index++}`); values.push(body.email); }
        if (body.nom_user !== undefined) { updates.push(`nom_user = $${index++}`); values.push(body.nom_user); }
        if (body.prenom_user !== undefined) { updates.push(`prenom_user = $${index++}`); values.push(body.prenom_user); }
        if (body.telephone !== undefined) { updates.push(`telephone = $${index++}`); values.push(body.telephone); }
        if (body.photo_profile !== undefined) { updates.push(`photo_profile = $${index++}`); values.push(body.photo_profile); }
        if (body.salaire !== undefined) { updates.push(`salaire = $${index++}`); values.push(body.salaire); }
        if (body.date_embauche !== undefined) { updates.push(`date_embauche = $${index++}`); values.push(body.date_embauche); }
        if (body.id_statut_employe !== undefined) { updates.push(`id_statut_employe = $${index++}`); values.push(body.id_statut_employe); }
        if (body.id_profil !== undefined) { updates.push(`id_profil = $${index++}`); values.push(body.id_profil); }
        if (body.password) {
            const hash = await bcrypt.hash(body.password, 12);
            updates.push(`password_hash = $${index++}`);
            values.push(hash);
        }

        if (updates.length === 0) {
            res.json({ message: 'Aucune modification apportée' });
            return;
        }

        values.push(id);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id_user = $${index}`,
            values
        );

        res.json({ message: 'Utilisateur mis à jour avec succès' });
    } catch (error) {
        next(error);
    }
};

// ============================ DELETE ============================
export const deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id }: GetUserInput = (req as any).validated.params;

        const { rowCount } = await pool.query('DELETE FROM users WHERE id_user = $1', [id]);

        if (rowCount === 0) {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
            return;
        }

        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        next(error);
    }
};