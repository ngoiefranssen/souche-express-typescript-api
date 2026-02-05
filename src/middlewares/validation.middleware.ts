import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Interface pour étendre Request
export interface ValidatedRequest extends Request {
  validated: {
    body?: any;
    query?: any;
    params?: any;
  };
}

export const validate = (schema: z.ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Stocker les données validées
      (req as ValidatedRequest).validated = validated;

      return next();
    } catch (error) {
      
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation échouée',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return next(error);
    }
  };
};