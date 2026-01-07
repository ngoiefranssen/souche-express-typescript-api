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
  RegisterInput,
  UpdateUserBody,
  UpdateUserParams,
  GetUserInput,
  ListUsersInput,
  DeleteUserInput
} from '../../schemas/admin/users.schema';
import { processFileUpload } from '../../utils/formDataParser';
import { UPLOAD_CONFIGS } from '../../db/config/upload.config';
import Role from '../../models/admin/Role.model';
import User from '../../models/admin/Users.model';
import Profile from '../../models/admin/Profil.model';
import EmploymentStatus from '../../models/admin/EmploymentStatus.model';


/**
 * @route
 * @desc    Register a new user (accepts FormData with file upload)
 * @access  Private/Admin
 */
export const registerUser = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Get validated and transformed data from Zod
    const {
      email,
      username,
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

    try {
      // Check if email already exists
      const existingUser = await User.findOne({
        where: {
          email: email.toLowerCase().trim()
        }
      });

      if (existingUser) {
        throw new ConflictError('This email is already in use');
      }

      const existingUsername = await User.findOne({
        where: {
          username: username.toLowerCase().trim()
        }
      })

      if (existingUsername) {
        throw new ConflictError('This username is already in use');
      }

      // Verify profile exists
      const profileExists = await Profile.findByPk(profile_id);
      if (!profileExists) {
        throw new NotFoundError('Profile not found');
      }

      // Verify employment status exists if provided
      if (employment_status_id !== null && employment_status_id !== undefined) {
        const statusExists = await EmploymentStatus.findByPk(employment_status_id);
        if (!statusExists) {
          throw new NotFoundError('Employment status not found');
        }
      }

      // Process profile photo
      let profilePhotoUrl: string | null = null;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // Check if a file was uploaded via FormData
      const uploadedFile = await processFileUpload(req, UPLOAD_CONFIGS.PROFILE_PHOTO);

      if (uploadedFile) {
        // File uploaded - convert relative path to absolute URL
        profilePhotoUrl = `${baseUrl}${uploadedFile.url}`;
      } else if (profile_photo && typeof profile_photo === 'string' && profile_photo.trim()) {
        // No file uploaded, validate provided URL
        const trimmedUrl = profile_photo.trim();
        try {
          new URL(trimmedUrl);
          profilePhotoUrl = trimmedUrl;
        } catch {
          throw new ValidationError('Invalid profile photo URL');
        }
      }

      // Create user
      const user = await User.create({
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        passwordHash: password,
        firstName: first_name.trim(),
        lastName: last_name.trim(),
        phone: phone?.trim() || null,
        profilePhoto: profilePhotoUrl,
        salary: salary || null,
        hireDate: hire_date || null,
        employment_status_id: employment_status_id || null,
        profile_id,
      });

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profilePhoto: user.profilePhoto,
          profileId: user.profile_id,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      // Handle specific errors
      if (error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof ValidationError) {
        throw error;
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('This email is already in use');
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('This username is already in use');
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new NotFoundError('Referenced profile or status does not exist');
      }

      if (error instanceof SequelizeValidationError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation error');
      }

      throw new DatabaseError(`Failed to create user: ${error.message}`);
    }
  }
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get a single user by ID with profile and roles
 * @access  Private/Admin
 */
export const getUser = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: GetUserInput = (req as ValidatedRequest).validated.params;

    try {
      const user = await User.findByPk(id, {
        include: [
          {
            model: Profile,
            as: 'profile',
            attributes: ['id', 'label', 'description'],
            include: [
              {
                model: Role,
                as: 'roles',
                attributes: ['id', 'label', 'description'],
                through: { attributes: [] },
              }
            ]
          },
          {
            model: EmploymentStatus,
            as: 'employmentStatus',
            attributes: ['id', 'label', 'description'],
          }
        ],
        attributes: {
          exclude: ['passwordHash', 'deletedAt']
        }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const userData = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        salary: user.salary,
        hireDate: user.hireDate,
        employmentStatusId: user.employment_status_id,
        employmentStatus: user.employmentStatus ? {
          id: user.employmentStatus.id,
          label: user.employmentStatus.label,
          description: user.employmentStatus.description,
        } : null,
        profileId: user.profile_id,
        profile: user.profile ? {
          id: user.profile.id,
          label: user.profile.label,
          description: user.profile.description,
        } : null,
        roles: user.profile?.roles?.map(role => ({
          id: role.id,
          label: role.label,
          description: role.description,
        })) || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(200).json({
        status: 'success',
        data: userData,
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to retrieve user: ${error.message}`);
    }
  }
);

/**
 * @route   GET /api/v1/users
 * @desc    Get paginated list of users with optional filters
 * @access  Private/Admin
 */
export const listUsers = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      search,
      statut,
      profil,
    }: ListUsersInput = (req as ValidatedRequest).validated.query;

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (search?.trim()) {
      const searchTerm = search.trim();
      whereClause[Op.or] = [
        { email: { [Op.iLike]: `%${searchTerm}%` } },
        { username: { [Op.iLike]: `%${searchTerm}%` } },
        { firstName: { [Op.iLike]: `%${searchTerm}%` } },
        { lastName: { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }

    if (statut !== undefined) {
      whereClause.employment_status_id = statut;
    }

    if (profil !== undefined) {
      whereClause.profile_id = profil;
    }

    try {
      const { count, rows } = await User.findAndCountAll({
        where: whereClause,
        limit: limitNum,
        offset: offset,
        order: [['lastName', 'ASC'], ['firstName', 'ASC'], ['username', 'ASC']],
        include: [
          {
            model: Profile,
            as: 'profile',
            attributes: ['id', 'label'],
          },
          {
            model: EmploymentStatus,
            as: 'employmentStatus',
            attributes: ['id', 'label'],
          }
        ],
        attributes: {
          exclude: ['passwordHash', 'deletedAt']
        }
      });

      const totalPages = Math.ceil(count / limitNum);

      if (count > 0 && pageNum > totalPages) {
        throw new ValidationError(
          `Page ${pageNum} does not exist (total pages: ${totalPages})`
        );
      }

      const users = rows.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        profileId: user.profile_id,
        profileLabel: user.profile?.label || null,
        employmentStatusId: user.employment_status_id,
        employmentStatusLabel: user.employmentStatus?.label || null,
        hireDate: user.hireDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

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
        'X-Total-Count': count.toString(),
        'X-Page': pageNum.toString(),
        'X-Per-Page': limitNum.toString()
      });

      res.status(200).json({
        status: 'success',
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
        filters: {
          ...(search && { search }),
          ...(statut !== undefined && { statut }),
          ...(profil !== undefined && { profil }),
        },
      });
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new DatabaseError(
        `Failed to retrieve users list: ${err.message}`
      );
    }
  }
);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update a user by ID (accepts FormData with file upload)
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: UpdateUserParams = (req as ValidatedRequest).validated.params;
    const body: UpdateUserBody = (req as ValidatedRequest).validated?.body;

    try {
      // Find user
      const user = await User.findByPk(id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check email uniqueness if being updated
      if (body.email) {
        const duplicateUser = await User.findOne({
          where: {
            email: {
              [Op.iLike]: body.email.trim()
            },
            id: {
              [Op.ne]: id
            }
          }
        });

        if (duplicateUser) {
          throw new ConflictError('This email is already in use');
        }
      }

      // Check username uniqueness if being updated
      if (body.username) {
        const duplicateUserName = await User.findOne({
          where: {
            username: {
              [Op.iLike]: body.username.trim()
            },
            id: {
              [Op.ne]: id
            }
          }
        });

        if (duplicateUserName) {
          throw new ConflictError('This username is already in use');
        }
      }

      // Verify profile exists if being updated
      if (body.profile_id !== null && body.profile_id !== undefined) {
        const profileExists = await Profile.findByPk(body.profile_id);
        if (!profileExists) {
          throw new NotFoundError('Profile not found');
        }
      }

      // Verify employment status exists if being updated
      if (body.employment_status_id !== null && body.employment_status_id !== undefined) {
        const statusExists = await EmploymentStatus.findByPk(body.employment_status_id);
        if (!statusExists) {
          throw new NotFoundError('Employment status not found');
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (body.email !== undefined) {
        updateData.email = body.email.toLowerCase().trim();
      }
      if (body.username !== undefined) {
        updateData.username = body.username.toLowerCase().trim();
      }
      if (body.first_name !== undefined) {
        updateData.firstName = body.first_name.trim();
      }
      if (body.last_name !== undefined) {
        updateData.lastName = body.last_name.trim();
      }
      if (body.phone !== undefined) {
        updateData.phone = body.phone?.trim() || null;
      }
      if (body.salary !== undefined) {
        updateData.salary = body.salary;
      }
      if (body.hire_date !== undefined) {
        updateData.hireDate = body.hire_date;
      }
      if (body.employment_status_id !== undefined) {
        updateData.employment_status_id = body.employment_status_id;
      }
      if (body.profile_id !== undefined) {
        updateData.profile_id = body.profile_id;
      }
      if (body.password) {
        updateData.passwordHash = body.password;
      }

      // Process profile photo
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // Check if a file was uploaded via FormData
      const uploadedFile = await processFileUpload(req, UPLOAD_CONFIGS.PROFILE_PHOTO);

      if (uploadedFile) {
        // File uploaded - convert relative path to absolute URL
        updateData.profilePhoto = `${baseUrl}${uploadedFile.url}`;
      } else if (body.profile_photo !== undefined) {
        // No file uploaded, check if URL was provided or explicitly set to null
        if (body.profile_photo === null || body.profile_photo === '') {
          // Explicitly remove photo
          updateData.profilePhoto = null;
        } else if (typeof body.profile_photo === 'string' && body.profile_photo.trim()) {
          // Validate provided URL
          const trimmedUrl = body.profile_photo.trim();
          try {
            new URL(trimmedUrl);
            updateData.profilePhoto = trimmedUrl;
          } catch {
            throw new ValidationError('Invalid profile photo URL');
          }
        }
      }

      // Check if there are any changes
      if (Object.keys(updateData).length === 0) {
        res.status(200).json({
          status: 'success',
          message: 'No changes made'
        });
        return;
      }

      // Update user
      await user.update(updateData);

      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profilePhoto: user.profilePhoto,
          profileId: user.profile_id,
          employmentStatusId: user.employment_status_id,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      // Handle specific errors
      if (error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof ValidationError) {
        throw error;
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('This username is already in use');
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('This username is already in use');
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new NotFoundError('Referenced profile or status does not exist');
      }

      if (error instanceof SequelizeValidationError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation error');
      }

      throw new DatabaseError(`Failed to update user: ${error.message}`);
    }
  }
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete a user by ID (soft delete)
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }: DeleteUserInput = (req as ValidatedRequest).validated.params;

    try {
      const user = await User.findByPk(id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.destroy();

      res.status(200).json({
        status: 'success',
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to delete user: ${error.message}`);
    }
  }
);

/**
 * @route   POST /api/v1/users/:id/restore
 * @desc    Restore a soft-deleted user
 * @access  Private/Admin
 */
export const restoreUser = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = (req as ValidatedRequest).validated.params;

    try {
      const user = await User.findByPk(id, { paranoid: false });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.deletedAt) {
        throw new ConflictError('User is not deleted');
      }

      await user.restore();

      res.status(200).json({
        status: 'success',
        message: 'User restored successfully',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      throw new DatabaseError(`Failed to restore user: ${error.message}`);
    }
  }
);