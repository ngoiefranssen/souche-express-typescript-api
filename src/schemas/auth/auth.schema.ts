import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Email invalide' }),
    password: z.string().min(1, { message: 'Le mot de passe est requis' }),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, { message: 'Le refresh token est requis' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];