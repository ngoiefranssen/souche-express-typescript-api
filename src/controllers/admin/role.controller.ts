import { Request, Response, NextFunction } from 'express';
import { Op, ValidationError as SequelizeValidationError } from 'sequelize';
import { 
  asyncHandler, 
  ConflictError, 
  DatabaseError, 
  NotFoundError, 
  ValidationError 
} from '../../utils/errors';
import { ValidatedRequest } from '../../middlewares/validation.middleware';
import { 
  CreateRoleInput, 
  DeleteRoleInput, 
  GetRoleInput, 
  ListRolesInput 
} from '../../schemas/admin/roles.schema';
import Role from '../../models/admin/Role.model';
import ProfileRole from '../../models/admin/ProfileRole.model';

/**
 * @route   
 * @desc    Create a new role
 * @access  Private/Admin
 */
export const createRole = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { label, description }: CreateRoleInput = (req as ValidatedRequest).validated.body;

    try {
      // Check if role already exists (case-insensitive)
      const existingRole = await Role.findOne({
        where: {
          label: {
            [Op.iLike]: label.trim()
          }
        }
      });

      if (existingRole) {
        throw new ConflictError('A role with this label already exists');
      }

      // Create new role
      const role = await Role.create({
        label: label.trim(),
        description: description?.trim() || null,
      });

      res.status(201).json({
        status: 'success',
        message: 'Role created successfully',
        data: {
          id: role.id,
          label: role.label,
          description: role.description,
          created_at: role.createdAt,
          updated_at: role.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof ConflictError) {
        throw error;
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('A role with this label already exists');
      }

      if (error instanceof SequelizeValidationError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation error');
      }

      throw new DatabaseError(`Failed to create role: ${error.message}`);
    }
  }
);

/**
 * @route   GET /api/v1/roles
 * @desc    Get paginated list of roles with optional search and sorting
 * @access  Private/Admin
 */
export const listRoles = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validatedReq = req as ValidatedRequest;
    const queryData = validatedReq.validated?.query || req?.query;

    const {
      page = 1,
      limit = 20,
      search,
      orderBy = 'label',
      order = 'DESC',
    } = queryData as ListRolesInput;

    // Pagination validation and sanitization
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Field mapping: API field names to database field names
    const fieldMapping: Record<string, string> = {
      'label': 'label',
      'description': 'description',
      'id': 'id',
      'created_at': 'created_at',
      'updated_at': 'updated_at',
    };

    const orderByField = fieldMapping[orderBy] || 'label';
    const orderDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Build where clause for search
    const whereClause: any = {};

    if (search?.trim()) {
      const searchTerm = search.trim();
      whereClause[Op.or] = [
        { label: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }

    try {
      // Execute query with count
      const { count, rows } = await Role.findAndCountAll({
        where: whereClause,
        limit: limitNum,
        offset: offset,
        order: [[orderByField, orderDirection]],
        attributes: ['id', 'label', 'description', 'created_at', 'updated_at'],
      });

      const totalPages = Math.ceil(count / limitNum);

      // Validate page number
      if (count > 0 && pageNum > totalPages) {
        throw new ValidationError(
          `Page ${pageNum} does not exist (total pages: ${totalPages})`
        );
      }

      // Format response data
      const roles = rows.map(role => ({
        id: role.id,
        label: role.label,
        description: role.description,
        created_at: role.createdAt,
        updated_at: role.updatedAt,
      }));

      // Return standardized response
      res.status(200).json({
        status: 'success',
        data: roles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
        filters: {
          ...(search && { search: search.trim() }),
          orderBy,
          order: orderDirection,
        },
      });
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new DatabaseError(
        `Failed to retrieve roles list: ${err.message}`
      );
    }
  }
);

/**
 * @route   GET /api/v1/roles/:id
 * @desc    Get a single role by ID
 * @access  Private/Admin
 */
export const getRole = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: GetRoleInput = (req as ValidatedRequest).validated?.params;

    try {
      const role = await Role.findByPk(id, {
        attributes: ['id', 'label', 'description', 'created_at', 'updated_at'],
      });

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      res.status(200).json({
        status: 'success',
        data: {
          id: role.id,
          label: role.label,
          description: role.description,
          created_at: role.createdAt,
          updated_at: role.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to retrieve role: ${error.message}`);
    }
  }
);

/**
 * @route   PATCH /api/v1/roles/:id
 * @desc    Update a role by ID
 * @access  Private/Admin
 */
export const updateRole = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = (req as ValidatedRequest).validated?.params;
    const { label, description } = (req as ValidatedRequest).validated?.body;

    try {
      // Find role by primary key
      const role = await Role.findByPk(id);

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      // Check for duplicate label if label is being updated
      if (label) {
        const duplicateRole = await Role.findOne({
          where: {
            label: {
              [Op.iLike]: label.trim()
            },
            id: {
              [Op.ne]: id
            }
          }
        });

        if (duplicateRole) {
          throw new ConflictError('A role with this label already exists');
        }
      }

      // Build update object
      const updateData: Partial<{ label: string; description: string | null }> = {};
      
      if (label !== undefined) {
        updateData.label = label.trim();
      }
      
      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }

      // Perform update
      await role.update(updateData);

      // Return updated role
      res.status(200).json({
        status: 'success',
        message: 'Role updated successfully',
        data: {
          id: role.id,
          label: role.label,
          description: role.description,
          created_at: role.createdAt,
          updated_at: role.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('A role with this label already exists');
      }

      if (error instanceof SequelizeValidationError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation error');
      }

      throw new DatabaseError(`Failed to update role: ${error.message}`);
    }
  }
);

/**
 * @route   DELETE /api/v1/roles/:id
 * @desc    Delete a role by ID (soft delete)
 * @access  Private/Admin
 */
export const deleteRole = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: DeleteRoleInput = (req as ValidatedRequest).validated.params;

    try {
      // Find role by primary key
      const role = await Role.findByPk(id);

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      // Check if role is in use by profiles
      const usageCount = await ProfileRole.count({
        where: { roleId: id }
      });

      if (usageCount > 0) {
        throw new ConflictError(
          'Cannot delete this role because it is assigned to one or more profiles'
        );
      }

      // Perform soft delete (sets deletedAt timestamp)
      await role.destroy();

      res.status(200).json({
        status: 'success',
        message: 'Role deleted successfully',
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new ConflictError(
          'Cannot delete this role because it is referenced by other data'
        );
      }

      throw new DatabaseError(`Failed to delete role: ${error.message}`);
    }
  }
);