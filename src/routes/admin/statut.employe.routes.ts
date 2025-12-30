import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware';
import { createStatutEmploye, deleteStatutEmploye, getStatutEmploye, listStatutEmployes, updateStatuEmploye } from '../../controllers/admin/statut_employe.controller';
import { createStatuEmployeSchema, deleteStatuEmployeSchema, getStatuEmployeSchema, listStatuEmployeSchema, updatedStatuEmployeSchema } from '../../schemas/admin/statut.employe.schema';


const router = Router();

router.post('/create', validate(createStatuEmployeSchema), createStatutEmploye);
router.get('/list/default', validate(listStatuEmployeSchema), listStatutEmployes);
router.get('/one/:id', validate(getStatuEmployeSchema), getStatutEmploye);
router.patch('/mod/:id', validate(updatedStatuEmployeSchema), updateStatuEmploye);
router.delete('/move/:id', validate(deleteStatuEmployeSchema), deleteStatutEmploye);

export default router;