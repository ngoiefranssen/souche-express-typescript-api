import { Router } from 'express';
import {
  registerUser,
  getUser,
  listUsers,
  updateUser,
  deleteUser,
} from '../../controllers/admin/Users.controller';
import {deleteUserSchema, getUserSchema, listUsersSchema, registerSchema, updateUserSchema } from '../../schemas/admin/users.schema';
import { validate } from '../../middlewares/validation.middleware';

const router = Router();

// ======================== ROUTES UTILISATEURS ========================
router.post('/register/default', validate(registerSchema), registerUser);
router.get('/all/data/default', validate(listUsersSchema), listUsers);
router.get('/one/data/:id', validate(getUserSchema), getUser);
router.patch('/updated/data/:id', validate(updateUserSchema), updateUser);
router.delete('/removeded/one/data/:id', validate(deleteUserSchema), deleteUser);

export default router;