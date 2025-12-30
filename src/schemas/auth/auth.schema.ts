import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Email invalide' }),
    password: z.string().min(1, { message: 'Le mot de passe est requis' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];