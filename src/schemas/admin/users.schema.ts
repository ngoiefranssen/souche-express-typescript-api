import { z } from 'zod';
import { coerceNumber } from "../../db/config/HelperCoerce";

// ==================== Schema de base commun ====================
const userBaseSchema = z.object({
  email: z.string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' })
    .optional(),

  username: z.string()
    .min(2, { message: 'Username must be at least 2 characters' })
    .max(50, { message: 'Username cannot exceed 50 characters' }),
  
  last_name: z.string()
    .min(2, { message: 'Last name must be at least 2 characters' })
    .max(50, { message: 'Last name cannot exceed 50 characters' }),
  
  first_name: z.string()
    .min(2, { message: 'First name must be at least 2 characters' })
    .max(50, { message: 'First name cannot exceed 50 characters' }),
  
  phone: z.string()
    .max(20, { message: 'Phone cannot exceed 20 characters' })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  profile_photo: z.preprocess((val) => {
    if (val === null || val === undefined || val === '' || val === 'null') {
      return undefined;
    }
    if (typeof val === 'object') {
      return undefined;
    }
    return val;
  }, z.string().url({ message: 'Profile photo must be a valid URL' }).optional().nullable()),
  
  // Coerce string to number for FormData
  salary: coerceNumber
    .refine((val) => val === undefined || val >= 0, {
      message: 'Salary must be positive',
    })
    .optional()
    .nullable(),
  
  hire_date: z.preprocess((val) => {
    if (val === null || val === undefined || val === '' || val === 'null') {
      return undefined;
    }
    return val;
  }, z.string().date({ message: 'Invalid date format (YYYY-MM-DD)' }).optional().nullable()),
  
  employment_status_id: coerceNumber
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: 'Employment status ID must be a positive integer',
    })
    .optional()
    .nullable(),
  
  profile_id: coerceNumber
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: 'Profile ID must be a positive integer',
    })
    .optional()
    .nullable(),
});

// ==================== Schema pour l'inscription (Register) ====================
export const registerSchema = z.object({
  body: userBaseSchema.extend({
    email: z.string()
      .min(1, { message: 'Email is required' })
      .email({ message: 'Invalid email address' }),
    
    password: z.string()
      .min(8, { message: 'Password must be at least 8 characters' }),
    
    // profile_id obligatoire lors de l'inscription
    profile_id: z.union([
      z.number().int().positive(),
      z.string().transform((val) => {
        const num = Number(val);
        if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
          throw new Error('Profile ID must be a positive integer');
        }
        return num;
      })
    ]),
  }),
});

// ==================== Schema pour la mise à jour ====================
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'Invalid user ID' })),
  }),
  body: userBaseSchema.partial().extend({
    password: z.string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ),
});

// ==================== Schema pour récupérer un utilisateur ====================
export const getUserSchema = z.object({
  params: z.object({
    id: z.string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'Invalid user ID' })),
  }),
});

// ==================== Schema pour lister les utilisateurs ====================
export const listUsersSchema = z.object({
  query: z.object({
    page: z.string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1)),
    
    limit: z.string()
      .optional()
      .default('20')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100)),
    
    search: z.string().optional(),
    
    statut: z.string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
      })
      .pipe(z.number().int().positive().optional()),
    
    profil: z.string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
      })
      .pipe(z.number().int().positive().optional()),
  }),
});

// ==================== Schema pour supprimer un utilisateur ====================
export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'Invalid user ID' })),
  }),
});

// ==================== Types TypeScript ====================
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserParams = UpdateUserInput['params'];
export type UpdateUserBody = UpdateUserInput['body'];
export type GetUserInput = z.infer<typeof getUserSchema>['params'];
export type ListUsersInput = z.infer<typeof listUsersSchema>['query'];
export type DeleteUserInput = z.infer<typeof deleteUserSchema>['params'];