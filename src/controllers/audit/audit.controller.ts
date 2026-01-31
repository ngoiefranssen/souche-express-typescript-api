import { Request, Response } from 'express';
import { AuditLog } from '../../models/audit/audit_log.model';
import { validateCsrf } from '../../utils/csrf';
import { hashIp } from '../../utils/audit';

interface AuditBody {
  email: string;
  success: boolean;
  ip: string;
}

declare module 'express-session' {
  interface SessionData {
    csrfSecret?: string;
    attempts?: number;
  }
}

export const postAudit = async (req: Request<{}, {}, AuditBody>, res: Response): Promise<Response> => {
  try {
    // CSRF
    const token = req.headers['x-csrf-token'] as string;
    if (!validateCsrf(req, token)) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    // Validation rapide
    const { email, success, ip } = req.body;
    if (!email || typeof success !== 'boolean') {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Enregistrement
    await AuditLog.create({
      email: email.toLowerCase().trim(),
      action: success ? 'login_success' : 'login_failed',
      ipHash: ip.startsWith('sha256:') ? ip : hashIp(ip),
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { attempts: (req.session?.attempts ?? 0) + 1 },
    });

    return res.status(204).send();
  } catch (e) {
    console.error('[audit] error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};