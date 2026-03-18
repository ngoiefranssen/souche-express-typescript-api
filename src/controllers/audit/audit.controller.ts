import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../../models/audit/audit_log.model';
import UserModel from '../../models/admin/users.model';
import { hashIp } from '../../utils/audit';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Op } from 'sequelize';

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

/**
 * Enregistrer un événement d'audit (usage interne)
 * Note: Cette route est généralement appelée automatiquement par le système
 */
export const postAudit = async (
  req: Request<{}, {}, AuditBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, success, ip } = req.body;

    // Validation
    if (!email || typeof success !== 'boolean') {
      res.status(400).json({ 
        status: 'error',
        message: 'Email et success sont requis' 
      });
      return;
    }

    // Enregistrement
    await AuditLog.create({
      email: email.toLowerCase().trim(),
      action: success ? 'login_success' : 'login_failed',
      ipHash: ip ? (ip.startsWith('sha256:') ? ip : hashIp(ip)) : undefined,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { attempts: (req.session?.attempts ?? 0) + 1 },
    });

    res.status(201).json({ 
      status: 'success',
      message: 'Événement d\'audit enregistré' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les logs d'audit (avec pagination et filtres)
 * Nécessite l'authentification et la permission 'audit:read'
 */
export const getAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Filtres
    const where: any = {};

    // Filtrer par utilisateur
    if (req.query.userId) {
      where.userId = Number(req.query.userId);
    }

    // Filtrer par action
    if (req.query.action) {
      where.action = req.query.action;
    }

    // Filtrer par ressource
    if (req.query.resource) {
      where.resource = req.query.resource;
    }

    // Filtrer par succès/échec
    if (typeof req.query.success === 'string') {
      where.success = req.query.success.toLowerCase() === 'true';
    }

    // Filtrer par date
    if (req.query.startDate || req.query.endDate) {
      where.created_at = {};
      if (req.query.startDate) {
        where.created_at[Op.gte] = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        where.created_at[Op.lte] = new Date(req.query.endDate as string);
      }
    }

    // Filtrer par gravité
    if (req.query.severity) {
      where.severity = req.query.severity;
    }

    // Requête avec pagination
    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']], // Plus récents en premier
    });

    res.status(200).json({
      status: 'success',
      data: {
        logs: auditLogs,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les statistiques d'audit
 */
export const getAuditStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await AuditLog.findAll({
      attributes: [
        'action',
        [AuditLog.sequelize!.fn('COUNT', AuditLog.sequelize!.col('id')), 'count'],
      ],
      group: ['action'],
      raw: true,
    });

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};
