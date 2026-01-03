import { Request, Response, NextFunction } from 'express';
import { Op, UniqueConstraintError, ForeignKeyConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
// import Profile from '../../models/Profile.model';
// import User from '../../models/User.model';
// import Role from '../../models/Role.model';
import {
  asyncHandler,
  ConflictError,
  DatabaseError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { ValidatedRequest } from '../../middlewares/validation.middleware';
import {
  CreateProfileInput,
  ListProfilesInput,
  GetProfileInput,
  DeleteProfileInput,
} from '../../schemas/admin/profiles.schema';
import Profile from '../../models/admin/Profil.model';
import Role from '../../models/admin/Role.model';
import User from '../../models/admin/Users.model';

// ==================== CREATE PROFILE ====================
export const createProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { label, description }: CreateProfileInput = (req as ValidatedRequest).validated.body;

    try {
      // Create profile
      const profile = await Profile.create({
        label,
        description: description || null,
      });

      res.status(201).json({
        status: 'success',
        message: 'Profile created successfully',
        data: {
          id: profile.id,
          label: profile.label,
          description: profile.description,
          created_at: profile.createdAt,
          updated_at: profile.updatedAt,
        },
        // _links: {
        //   self: { href: `/api/v1/profiles/${profile.id}` },
        //   update: { href: `/api/v1/profiles/${profile.id}`, method: 'PUT' },
        //   delete: { href: `/api/v1/profiles/${profile.id}`, method: 'DELETE' },
        // },
      });
    } catch (error: any) {
      // Sequelize unique constraint error
      if (error instanceof UniqueConstraintError) {
        throw new ConflictError('A profile with this label already exists');
      }

      // Sequelize validation error
      if (error instanceof SequelizeValidationError) {
        const messages = error.errors.map((e) => e.message).join(', ');
        throw new ValidationError(messages);
      }

      throw new DatabaseError('Error creating profile');
    }
  }
);

// ==================== LIST PROFILES ====================
export const listProfiles = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      search,
      orderBy = 'label',
      order = 'ASC',
      includeDeleted = false,
    }: ListProfilesInput = (req as ValidatedRequest).validated.query;

    // Pagination
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (search?.trim()) {
      whereClause[Op.or] = [
        { label: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    try {
      // Count and fetch data
      const { count, rows: profiles } = await Profile.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [[orderBy, order]],
        paranoid: !includeDeleted, // Include soft deleted if requested
        attributes: ['id', 'label', 'description', 'created_at', 'updated_at', 'deleted_at'],
      });

      const totalPages = Math.ceil(count / limit);

      // Check if requested page exists
      if (count > 0 && page > totalPages) {
        throw new ValidationError(`Page ${page} does not exist (total pages: ${totalPages})`);
      }

      // Add HATEOAS links
      const profilesWithLinks = profiles.map((profile) => ({
        id: profile.id,
        label: profile.label,
        description: profile.description,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
        ...(profile.deletedAt && { deleted_at: profile.deletedAt }),
        _links: {
          self: { href: `/api/v1/profiles/${profile.id}` },
        },
      }));

      // Set pagination headers (RFC 5988)
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      const linkHeader: string[] = [];

      if (page < totalPages) {
        linkHeader.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
        linkHeader.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);
      }
      if (page > 1) {
        linkHeader.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
        linkHeader.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
      }

      if (linkHeader.length > 0) {
        res.set('Link', linkHeader.join(', '));
      }

      res.set({
        'X-Total-Count': count.toString(),
        'X-Page': page.toString(),
        'X-Per-Page': limit.toString(),
      });

      res.status(200).json({
        status: 'success',
        data: profilesWithLinks,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          ...(search && { search }),
          orderBy,
          order,
          ...(includeDeleted && { includeDeleted }),
        },
      });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(`Error retrieving profiles: ${error.message}`);
    }
  }
);

// ==================== GET PROFILE ====================
export const getProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: GetProfileInput = (req as ValidatedRequest).validated.params;

    const profile = await Profile.findByPk(id, {
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'label', 'description'],
          through: { attributes: [] }, // Exclude junction table
        },
      ],
      attributes: ['id', 'label', 'description', 'created_at', 'updated_at'],
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: profile.id,
        label: profile.label,
        description: profile.description,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
        roles: profile.roles || [],
        // _links: {
        //   self: { href: `/api/v1/profiles/${profile.id}` },
        //   update: { href: `/api/v1/profiles/${profile.id}`, method: 'PUT' },
        //   delete: { href: `/api/v1/profiles/${profile.id}`, method: 'DELETE' },
        //   users: { href: `/api/v1/profiles/${profile.id}/users` },
        //   roles: { href: `/api/v1/profiles/${profile.id}/roles` },
        // },
      },
    });
  }
);

// ==================== UPDATE PROFILE ====================
export const updateProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = (req as ValidatedRequest).validated.params;
    const { label, description } = (req as ValidatedRequest).validated.body;

    // Find profile
    const profile = await Profile.findByPk(id);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    try {
      // Update profile
      if (label !== undefined) profile.label = label;
      if (description !== undefined) profile.description = description;

      await profile.save();

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          id: profile.id,
          label: profile.label,
          description: profile.description,
          updated_at: profile.updatedAt,
        },
      });
    } catch (error: any) {
      // Sequelize unique constraint error
      if (error instanceof UniqueConstraintError) {
        throw new ConflictError('A profile with this label already exists');
      }

      // Sequelize validation error
      if (error instanceof SequelizeValidationError) {
        const messages = error.errors.map((e) => e.message).join(', ');
        throw new ValidationError(messages);
      }

      throw new DatabaseError('Error updating profile');
    }
  }
);

// ==================== DELETE PROFILE (SOFT DELETE) ====================
export const deleteProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: DeleteProfileInput = (req as ValidatedRequest).validated.params;

    // Find profile
    const profile = await Profile.findByPk(id);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Check if profile is in use by users
    const userCount = await User.count({
      where: { profile_id: id },
    });

    if (userCount > 0) {
      throw new ConflictError(
        `Cannot delete this profile as it is assigned to ${userCount} user(s)`
      );
    }

    try {
      // Soft delete
      await profile.destroy();

      res.status(200).json({
        status: 'success',
        message: 'Profile deleted successfully',
      });
    } catch (error: any) {
      // Foreign key constraint error
      if (error instanceof ForeignKeyConstraintError) {
        throw new ConflictError('Cannot delete this profile as it is referenced by other data');
      }

      throw new DatabaseError('Error deleting profile');
    }
  }
);

// ==================== RESTORE PROFILE ====================
export const restoreProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: GetProfileInput = (req as ValidatedRequest).validated.params;

    // Find deleted profile
    const profile = await Profile.findByPk(id, {
      paranoid: false, // Include soft deleted
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    if (!profile.deletedAt) {
      throw new ConflictError('Profile is not deleted');
    }

    try {
      // Restore
      await profile.restore();

      res.status(200).json({
        status: 'success',
        message: 'Profile restored successfully',
        data: {
          id: profile.id,
          label: profile.label,
          description: profile.description,
        },
      });
    } catch (error: any) {
      throw new DatabaseError('Error restoring profile');
    }
  }
);

// ==================== HARD DELETE (ADMIN ONLY) ====================
export const hardDeleteProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: DeleteProfileInput = (req as ValidatedRequest).validated.params;

    // Find profile (including soft deleted)
    const profile = await Profile.findByPk(id, {
      paranoid: false,
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    try {
      // Permanent delete
      await profile.destroy({ force: true });

      res.status(200).json({
        status: 'success',
        message: 'Profile permanently deleted',
      });
    } catch (error: any) {
      if (error instanceof ForeignKeyConstraintError) {
        throw new ConflictError('Cannot delete: foreign key constraint violation');
      }

      throw new DatabaseError('Error permanently deleting profile');
    }
  }
);