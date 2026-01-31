import { Router } from 'express';
import { postAudit } from '../../controllers/audit/audit.controller';

const router = Router();

router.post('/audit', postAudit);

export default router;