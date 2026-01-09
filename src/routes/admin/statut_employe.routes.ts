import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware';
import { createStatutEmploye, deleteStatutEmploye, getStatutEmploye, listStatutEmployes, updateStatuEmploye } from '../../controllers/admin/employment_status.controller';
import { createStatuEmployeSchema, deleteStatuEmployeSchema, getStatuEmployeSchema, listStatuEmployeSchema, updatedStatuEmployeSchema } from '../../schemas/admin/statut_employe.schema';
import { authenticateToken } from '../../middlewares/auth.middleware';


const router = Router();

router.post('/create', authenticateToken, validate(createStatuEmployeSchema), createStatutEmploye);
router.get('/list/default', authenticateToken, validate(listStatuEmployeSchema), listStatutEmployes);
router.get('/one/:id', authenticateToken, validate(getStatuEmployeSchema), getStatutEmploye);
router.patch('/mod/:id', authenticateToken, validate(updatedStatuEmployeSchema), updateStatuEmploye);
router.delete('/move/:id', authenticateToken, validate(deleteStatuEmployeSchema), deleteStatutEmploye);

export default router;