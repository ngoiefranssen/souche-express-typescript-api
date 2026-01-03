import { z } from 'zod';

export const createProfileSchema = z.object({
  body: z.object({
    label: z
      .string()
      .min(3, { message: 'Label must be at least 3 characters' })
      .max(100, { message: 'Label cannot exceed 100 characters' })
      .trim(),
    description: z
      .string()
      .max(200, { message: 'Description cannot exceed 200 characters' })
      .trim()
      .optional()
      .nullable(),
  }),
});

// List schema
export const listProfilesSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1)),
    limit: z
      .string()
      .optional()
      .default('20')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100)),
    search: z.string().trim().optional(),
    orderBy: z.enum(['label', 'description', 'id', 'created_at']).optional().default('label'),
    order: z.enum(['ASC', 'DESC']).optional().default('ASC'),
    includeDeleted: z
      .string()
      .optional()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional(),
  }),
});

// Get schema
export const getProfileSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'Invalid ID' })),
  }),
});

// Update schema
export const updateProfileSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'Invalid ID' })),
  }),
  body: z
    .object({
      label: z
        .string()
        .min(3, { message: 'Label must be at least 3 characters' })
        .max(100, { message: 'Label cannot exceed 100 characters' })
        .trim()
        .optional(),
      description: z
        .string()
        .max(200, { message: 'Description cannot exceed 200 characters' })
        .trim()
        .optional()
        .nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

// Delete schema
export const deleteProfileSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive({ message: 'Invalid ID' })),
  }),
});

// TypeScript types
export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
export type ListProfilesInput = z.infer<typeof listProfilesSchema>['query'];
export type GetProfileInput = z.infer<typeof getProfileSchema>['params'];
export type UpdateProfileInput = {
  params: z.infer<typeof updateProfileSchema>['params'];
  body: z.infer<typeof updateProfileSchema>['body'];
};
export type DeleteProfileInput = z.infer<typeof deleteProfileSchema>['params'];