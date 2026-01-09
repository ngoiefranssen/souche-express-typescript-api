import { Router } from 'express';
import {
  registerUser,
  getUser,
  listUsers,
  updateUser,
  deleteUser,
} from '../../controllers/admin/users.controller';
import {deleteUserSchema, getUserSchema, listUsersSchema, registerSchema, updateUserSchema } from '../../schemas/admin/users.schema';
import { validate } from '../../middlewares/validation.middleware';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();

// ======================== ROUTES UTILISATEURS ========================
router.post('/register/default', authenticateToken, validate(registerSchema), registerUser);
router.get('/all/data/default', authenticateToken, validate(listUsersSchema), listUsers);
router.get('/one/data/:id', authenticateToken, validate(getUserSchema), getUser);
router.patch('/updated/data/:id', authenticateToken, validate(updateUserSchema), updateUser);
router.delete('/removeded/one/data/:id', authenticateToken, validate(deleteUserSchema), deleteUser);

export default router;