import { Router } from 'express';
import {
  createProfilSchema,
  listProfilsSchema,
  getProfilSchema,
  updateProfilSchema,
  deleteProfilSchema,
} from '../../schemas/admin/profils.schema';
import { validate } from '../../middlewares/validation.middleware';
import {
  createProfil,
  deleteProfil,
  getProfil,
  listProfils,
  updateProfil,
} from '../../controllers/admin/profil.controller';

const router = Router();

router.post('/create', validate(createProfilSchema), createProfil);
router.get('/list/default', validate(listProfilsSchema), listProfils);
router.get('/:id', validate(getProfilSchema), getProfil);
router.patch('/:id', validate(updateProfilSchema), updateProfil);
router.delete('/:id', validate(deleteProfilSchema), deleteProfil);

export default router;