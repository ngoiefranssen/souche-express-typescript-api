import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware';
import {
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile,
} from '../../controllers/admin/profile.controller';
import { createProfileSchema, deleteProfileSchema, getProfileSchema, listProfilesSchema, updateProfileSchema } from '../../schemas/admin/profiles.schema';

const router = Router();

router.post('/create', validate(createProfileSchema), createProfile);
router.get('/list/default', validate(listProfilesSchema), listProfiles);
router.get('/:id', validate(getProfileSchema), getProfile);
router.patch('/:id', validate(updateProfileSchema), updateProfile);
router.delete('/:id', validate(deleteProfileSchema), deleteProfile);

export default router;