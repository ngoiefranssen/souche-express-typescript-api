import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../db/config/db';
import { 
    asyncHandler, 
    ConflictError, 
    DatabaseError, 
    NotFoundError, 
    ValidationError 
} from '../../utils/errors';
import { ValidatedRequest } from '../../middlewares/validation.middleware';

// Types
interface RegisterInput {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    profile_photo?: string;
    salary?: number;
    hire_date?: string;
    employment_status_id?: number;
    profile_id: number;
}

interface UpdateUserBody {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    profile_photo?: string;
    salary?: number;
    hire_date?: string;
    employment_status_id?: number;
    profile_id?: number;
}

interface ListUsersQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
    profile?: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
}

// ==================== REGISTER USER ====================
export const registerUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const {
            email,
            password,
            first_name,
            last_name,
            phone,
            profile_photo,
            salary,
            hire_date,
            employment_status_id,
            profile_id,
        }: RegisterInput = (req as ValidatedRequest).validated.body;

        // Check if email already exists
        const checkQuery = 'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL';
        const checkResult = await pool.query(checkQuery, [email]);

        if (checkResult.rows.length > 0) {
            throw new ConflictError('This email is already in use');
        }

        // Verify profile exists
        const profileCheck = await pool.query(
            'SELECT id FROM profiles WHERE id = $1 AND deleted_at IS NULL',
            [profile_id]
        );

        if (profileCheck.rows.length === 0) {
            throw new NotFoundError('Profile not found');
        }

        try {
            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Insert new user
            const insertQuery = `
                INSERT INTO users (
                    email, password_hash, first_name, last_name, phone,
                    profile_photo, salary, hire_date, employment_status_id, profile_id,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                RETURNING 
                    id, email, first_name, last_name, phone, 
                    profile_photo, profile_id, created_at
            `;

            const result = await pool.query(insertQuery, [
                email,
                passwordHash,
                first_name,
                last_name,
                phone ?? null,
                profile_photo ?? null,
                salary ?? null,
                hire_date ?? null,
                employment_status_id ?? null,
                profile_id,
            ]);

            res.status(201).json({
                status: 'success',
                message: 'User created successfully',
                data: result.rows[0],
                // _links: {
                //     self: { href: `/api/v1/users/${result.rows[0].id}` },
                //     update: { href: `/api/v1/users/${result.rows[0].id}`, method: 'PUT' },
                //     delete: { href: `/api/v1/users/${result.rows[0].id}`, method: 'DELETE' }
                // }
            });
        } catch (error: any) {
            if (error.code === '23505') {
                throw new ConflictError('This email is already in use');
            }
            if (error.code === '23503') {
                throw new NotFoundError('Referenced profile or status does not exist');
            }
            throw new DatabaseError('Error creating user');
        }
    }
);

// ==================== GET ONE USER ====================
export const getUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated.params;

        const query = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.profile_photo,
                u.salary,
                u.hire_date,
                u.employment_status_id,
                es.label AS employment_status_label,
                u.profile_id,
                p.label AS profile_label,
                p.description AS profile_description,
                u.created_at,
                u.updated_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'role_id', r.id,
                            'role_label', r.label,
                            'role_description', r.description
                        )
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'
                ) AS roles
            FROM users u
            LEFT JOIN employment_statuses es ON u.employment_status_id = es.id
            LEFT JOIN profiles p ON u.profile_id = p.id
            LEFT JOIN profile_roles pr ON p.id = pr.profile_id
            LEFT JOIN roles r ON pr.role_id = r.id AND r.deleted_at IS NULL
            WHERE u.id = $1 AND u.deleted_at IS NULL
            GROUP BY 
                u.id, 
                es.label, 
                p.id, 
                p.label, 
                p.description
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        const user = result.rows[0];

        res.status(200).json({
            status: 'success',
            data: {
                ...user,
                // _links: {
                //     self: { href: `/api/v1/users/${user.id}` },
                //     update: { href: `/api/v1/users/${user.id}`, method: 'PUT' },
                //     delete: { href: `/api/v1/users/removeded/one/data/${user.id}`, method: 'DELETE' },
                //     profile: { href: `/api/v1/profiles/${user.profile_id}` }
                // }
            }
        });
    }
);

// ==================== LIST USERS ====================
export const listUsers = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            profile,
            orderBy = 'last_name',
            order = 'ASC',
        }: ListUsersQuery = (req as ValidatedRequest).validated.query;

        // Pagination
        const pageNum = Math.max(1, page);
        const limitNum = Math.min(100, Math.max(1, limit));
        const offset = (pageNum - 1) * limitNum;

        // Validate sorting
        const validOrderBy = ['first_name', 'last_name', 'email', 'hire_date', 'created_at'];
        const validOrder = ['ASC', 'DESC'];

        if (!validOrderBy.includes(orderBy)) {
            throw new ValidationError(`Invalid orderBy field: ${orderBy}`);
        }
        if (!validOrder.includes(order)) {
            throw new ValidationError(`Invalid order direction: ${order}`);
        }

        // Build WHERE clause
        const queryParams: any[] = [];
        let paramIdx = 1;
        let whereClause = 'WHERE u.deleted_at IS NULL';

        if (search?.trim()) {
            whereClause += ` AND (
                u.email ILIKE $${paramIdx} 
                OR u.first_name ILIKE $${paramIdx} 
                OR u.last_name ILIKE $${paramIdx}
            )`;
            queryParams.push(`%${search.trim()}%`);
            paramIdx++;
        }

        if (status !== undefined) {
            whereClause += ` AND u.employment_status_id = $${paramIdx}`;
            queryParams.push(status);
            paramIdx++;
        }

        if (profile !== undefined) {
            whereClause += ` AND u.profile_id = $${paramIdx}`;
            queryParams.push(profile);
            paramIdx++;
        }

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM users u 
            ${whereClause}
        `;

        // Data query
        const dataQuery = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.profile_photo,
                u.profile_id,
                p.label AS profile_label,
                u.employment_status_id,
                es.label AS employment_status_label,
                u.hire_date,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN profiles p ON u.profile_id = p.id
            LEFT JOIN employment_statuses es ON u.employment_status_id = es.id
            ${whereClause}
            ORDER BY u.${orderBy} ${order}
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, queryParams),
            pool.query(dataQuery, [...queryParams, limitNum, offset]),
        ]);

        const total = parseInt(countResult.rows[0]?.total || '0', 10);
        const users = dataResult.rows.map(user => ({
            ...user,
            // _links: {
            //     self: { href: `/api/v1/users/${user.id}` }
            // }
        }));

        const totalPages = Math.ceil(total / limitNum);

        if (total > 0 && pageNum > totalPages) {
            throw new ValidationError(
                `Page ${pageNum} does not exist (total pages: ${totalPages})`
            );
        }

        // Set pagination headers
        const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
        const linkHeader: string[] = [];

        if (pageNum < totalPages) {
            linkHeader.push(`<${baseUrl}?page=${pageNum + 1}&limit=${limitNum}>; rel="next"`);
            linkHeader.push(`<${baseUrl}?page=${totalPages}&limit=${limitNum}>; rel="last"`);
        }
        if (pageNum > 1) {
            linkHeader.push(`<${baseUrl}?page=${pageNum - 1}&limit=${limitNum}>; rel="prev"`);
            linkHeader.push(`<${baseUrl}?page=1&limit=${limitNum}>; rel="first"`);
        }

        if (linkHeader.length > 0) {
            res.set('Link', linkHeader.join(', '));
        }

        res.set({
            'X-Total-Count': total.toString(),
            'X-Page': pageNum.toString(),
            'X-Per-Page': limitNum.toString()
        });

        res.status(200).json({
            status: 'success',
            data: users,
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
                ...(status !== undefined && { status }),
                ...(profile !== undefined && { profile }),
                orderBy,
                order,
            },
        });
    }
);

// ==================== UPDATE USER ====================
export const updateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated.params;
        const body: UpdateUserBody = (req as ValidatedRequest).validated?.body;

        // Check if user exists
        const checkQuery = 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        // Check for duplicate email
        if (body.email) {
            const duplicateQuery = `
                SELECT id FROM users 
                WHERE email = $1 AND id != $2 AND deleted_at IS NULL
            `;
            const duplicateResult = await pool.query(duplicateQuery, [body.email, id]);

            if (duplicateResult.rows.length > 0) {
                throw new ConflictError('This email is already in use');
            }
        }

        // Verify references if provided
        if (body.profile_id) {
            const profileCheck = await pool.query(
                'SELECT id FROM profiles WHERE id = $1 AND deleted_at IS NULL',
                [body.profile_id]
            );
            if (profileCheck.rows.length === 0) {
                throw new NotFoundError('Profile not found');
            }
        }

        if (body.employment_status_id) {
            const statusCheck = await pool.query(
                'SELECT id FROM employment_statuses WHERE id = $1',
                [body.employment_status_id]
            );
            if (statusCheck.rows.length === 0) {
                throw new NotFoundError('Employment status not found');
            }
        }

        // Build dynamic update query
        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [];
        let paramIndex = 1;

        if (body.email !== undefined) {
            updates.push(`email = $${paramIndex}`);
            values.push(body.email);
            paramIndex++;
        }

        if (body.first_name !== undefined) {
            updates.push(`first_name = $${paramIndex}`);
            values.push(body.first_name);
            paramIndex++;
        }

        if (body.last_name !== undefined) {
            updates.push(`last_name = $${paramIndex}`);
            values.push(body.last_name);
            paramIndex++;
        }

        if (body.phone !== undefined) {
            updates.push(`phone = $${paramIndex}`);
            values.push(body.phone);
            paramIndex++;
        }

        if (body.profile_photo !== undefined) {
            updates.push(`profile_photo = $${paramIndex}`);
            values.push(body.profile_photo);
            paramIndex++;
        }

        if (body.salary !== undefined) {
            updates.push(`salary = $${paramIndex}`);
            values.push(body.salary);
            paramIndex++;
        }

        if (body.hire_date !== undefined) {
            updates.push(`hire_date = $${paramIndex}`);
            values.push(body.hire_date);
            paramIndex++;
        }

        if (body.employment_status_id !== undefined) {
            updates.push(`employment_status_id = $${paramIndex}`);
            values.push(body.employment_status_id);
            paramIndex++;
        }

        if (body.profile_id !== undefined) {
            updates.push(`profile_id = $${paramIndex}`);
            values.push(body.profile_id);
            paramIndex++;
        }

        if (body.password) {
            const passwordHash = await bcrypt.hash(body.password, 12);
            updates.push(`password_hash = $${paramIndex}`);
            values.push(passwordHash);
            paramIndex++;
        }

        if (updates.length === 1) { // Only updated_at
            res.status(200).json({
                status: 'success',
                message: 'No changes made'
            });
            return;
        }

        values.push(id);

        try {
            const updateQuery = `
                UPDATE users 
                SET ${updates.join(', ')} 
                WHERE id = $${paramIndex}
                RETURNING 
                    id, email, first_name, last_name, phone,
                    profile_photo, profile_id, employment_status_id,
                    updated_at
            `;

            const result = await pool.query(updateQuery, values);

            res.status(200).json({
                status: 'success',
                message: 'User updated successfully',
                data: result.rows[0],
            });
        } catch (error: any) {
            if (error.code === '23505') {
                throw new ConflictError('This email is already in use');
            }
            if (error.code === '23503') {
                throw new NotFoundError('Referenced profile or status does not exist');
            }
            throw new DatabaseError('Error updating user');
        }
    }
);

// ==================== DELETE USER (SOFT DELETE) ====================
export const deleteUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated.params;

        // Check if user exists and not already deleted
        const checkQuery = 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        try {
            // Soft delete
            const deleteQuery = `
                UPDATE users 
                SET deleted_at = NOW(), updated_at = NOW()
                WHERE id = $1 
                RETURNING id
            `;
            await pool.query(deleteQuery, [id]);

            res.status(200).json({
                status: 'success',
                message: 'User deleted successfully',
            });
        } catch (error: any) {
            throw new DatabaseError('Error deleting user');
        }
    }
);

// ==================== RESTORE USER ====================
export const restoreUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
        const { id } = (req as ValidatedRequest).validated.params;

        // Check if user exists and is deleted
        const checkQuery = 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NOT NULL';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            throw new NotFoundError('Deleted user not found');
        }

        const restoreQuery = `
            UPDATE users 
            SET deleted_at = NULL, updated_at = NOW()
            WHERE id = $1 
            RETURNING id, email, first_name, last_name
        `;
        const result = await pool.query(restoreQuery, [id]);

        res.status(200).json({
            status: 'success',
            message: 'User restored successfully',
            data: result.rows[0],
        });
    }
);