import { Router } from 'express';
import { 
  postAudit, 
  getAuditLogs, 
  getAuditStats 
} from '../../controllers/audit/audit.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/authorization.middleware';

const router = Router();

// Enregistrer un événement d'audit (usage interne - pas d'auth)
router.post('/user-activity', postAudit);

// Récupérer les logs d'audit (authentification + permission requises)
router.get(
  '/logs',
  authenticateToken,
  authorize('audit:read'),
  getAuditLogs
);

// Statistiques d'audit (authentification + permission requises)
router.get(
  '/stats',
  authenticateToken,
  authorize('audit:read'),
  getAuditStats
);

export default router;
