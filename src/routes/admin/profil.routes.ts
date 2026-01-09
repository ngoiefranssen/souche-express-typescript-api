import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware';
import {
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile,
} from '../../controllers/admin/Profile.controller';
import { createProfileSchema, deleteProfileSchema, getProfileSchema, listProfilesSchema, updateProfileSchema } from '../../schemas/admin/profiles.schema';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/create', authenticateToken, validate(createProfileSchema), createProfile);
router.get('/list/default', authenticateToken, validate(listProfilesSchema), listProfiles);
router.get('/:id', authenticateToken, validate(getProfileSchema), getProfile);
router.patch('/:id', authenticateToken, validate(updateProfileSchema), updateProfile);
router.delete('/:id', authenticateToken, validate(deleteProfileSchema), deleteProfile);

export default router;