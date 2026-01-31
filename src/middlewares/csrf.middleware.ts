import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/* Étend SessionData */
declare module 'express-session' {
  interface SessionData {
    csrfSecret?: string;
    attempts?: number;
  }
}

/* Étend Request pour ta fonction helper */
declare global {
  namespace Express {
    interface Request {
      csrfToken: () => string;
    }
  }
}

export function csrfMiddleware(req: Request, _res: Response, next: NextFunction) {
  
  if (!req.session?.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
  }

  req.csrfToken = () =>
    crypto
      .createHash('sha256')
      .update(req?.session?.csrfSecret + req?.sessionID)
      .digest('hex');

  next();
}