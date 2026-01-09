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
  createStatuEmployeInput, 
  DeleteStatuEmployeInput, 
  GetStatuEmployeInput, 
  ListStatuEmployeInput 
} from '../../schemas/admin/statut_employe.schema';
import EmploymentStatus from '../../models/admin/employment_status.model';
import User from '../../models/admin/users.model';

/**
 * @route
 * @desc    Create a new employment status
 * @access  Private/Admin
 */
export const createStatutEmploye = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { label, description }: createStatuEmployeInput = (req as ValidatedRequest).validated?.body;

    try {
      // Check if employment status already exists (case-insensitive)
      const existingStatus = await EmploymentStatus.findOne({
        where: {
          label: {
            [Op.iLike]: label.trim()
          }
        }
      });

      if (existingStatus) {
        throw new ConflictError('An employment status with this label already exists');
      }

      // Create new employment status
      const status = await EmploymentStatus.create({
        label: label.trim(),
        description: description?.trim() || null,
      });

      res.status(201).json({
        status: 'success',
        message: 'Employment status created successfully',
        data: {
          id: status.id,
          label: status.label,
          description: status.description,
        },
      });
    } catch (error: any) {
      if (error instanceof ConflictError) {
        throw error;
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('An employment status with this label already exists');
      }

      if (error instanceof SequelizeValidationError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation error');
      }

      throw new DatabaseError(`Failed to create employment status: ${error.message}`);
    }
  }
);

/**
 * @route
 * @desc    Get paginated list of employment statuses with optional search and sorting
 * @access  Private/Admin
 */
export const listStatutEmployes = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validatedReq = req as ValidatedRequest;
    const queryData = validatedReq.validated?.query || req?.query;

    const {
      page = 1,
      limit = 20,
      search,
      orderBy = 'label',
      order = 'DESC',
    } = queryData as ListStatuEmployeInput;

    // Pagination validation and sanitization
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Field mapping: API field names to database field names
    const fieldMapping: Record<string, string> = {
      'label': 'label',
      'description': 'description',
      'id': 'id',
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
      const { count, rows } = await EmploymentStatus.findAndCountAll({
        where: whereClause,
        limit: limitNum,
        offset: offset,
        order: [[orderByField, orderDirection]],
        attributes: ['id', 'label', 'description'],
      });

      const totalPages = Math.ceil(count / limitNum);

      // Validate page number
      if (count > 0 && pageNum > totalPages) {
        throw new ValidationError(
          `Page ${pageNum} does not exist (total pages: ${totalPages})`
        );
      }

      // Format response data
      const statuses = rows.map(status => ({
        id: status.id,
        label: status.label,
        description: status.description,
      }));

      // Return standardized response
      res.status(200).json({
        status: 'success',
        data: statuses,
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
        `Failed to retrieve employment statuses list: ${err.message}`
      );
    }
  }
);

/**
 * @route
 * @desc    Get a single employment status by ID
 * @access  Private/Admin
 */
export const getStatutEmploye = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: GetStatuEmployeInput = (req as ValidatedRequest).validated?.params;

    try {
      const status = await EmploymentStatus.findByPk(id, {
        attributes: ['id', 'label', 'description'],
      });

      if (!status) {
        throw new NotFoundError('Employment status not found');
      }

      res.status(200).json({
        status: 'success',
        data: {
          id: status.id,
          label: status.label,
          description: status.description,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to retrieve employment status: ${error.message}`);
    }
  }
);

/**
 * @route
 * @desc    Update an employment status by ID
 * @access  Private/Admin
 */
export const updateStatuEmploye = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = (req as ValidatedRequest).validated.params;
    const { label, description } = (req as ValidatedRequest).validated.body;

    try {
      // Find employment status by primary key
      const status = await EmploymentStatus.findByPk(id);

      if (!status) {
        throw new NotFoundError('Employment status not found');
      }

      // Check for duplicate label if label is being updated
      if (label) {
        const duplicateStatus = await EmploymentStatus.findOne({
          where: {
            label: {
              [Op.iLike]: label.trim()
            },
            id: {
              [Op.ne]: id
            }
          }
        });

        if (duplicateStatus) {
          throw new ConflictError('An employment status with this label already exists');
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
      await status.update(updateData);

      // Return updated employment status
      res.status(200).json({
        status: 'success',
        message: 'Employment status updated successfully',
        data: {
          id: status.id,
          label: status.label,
          description: status.description,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('An employment status with this label already exists');
      }

      if (error instanceof SequelizeValidationError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation error');
      }

      throw new DatabaseError(`Failed to update employment status: ${error.message}`);
    }
  }
);

/**
 * @route
 * @desc    Delete an employment status by ID
 * @access  Private/Admin
 */
export const deleteStatutEmploye = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: DeleteStatuEmployeInput = (req as ValidatedRequest).validated.params;

    try {
      // Find employment status by primary key
      const status = await EmploymentStatus.findByPk(id);

      if (!status) {
        throw new NotFoundError('Employment status not found');
      }

      // Check if employment status is in use by users
      const usageCount = await User.count({
        where: { employmentStatusId: id }
      });

      if (usageCount > 0) {
        throw new ConflictError(
          'Cannot delete this employment status because it is assigned to one or more users'
        );
      }

      // Perform hard delete (no paranoid mode in this model)
      await status.destroy();

      res.status(200).json({
        status: 'success',
        message: 'Employment status deleted successfully',
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new ConflictError(
          'Cannot delete this employment status because it is referenced by other data'
        );
      }

      throw new DatabaseError(`Failed to delete employment status: ${error.message}`);
    }
  }
);