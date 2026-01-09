import { Router } from 'express';
import { loginSchema } from '../../schemas/auth/auth.schema';
import { login, logout } from '../../controllers/auth/auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/oauth2/default/authorize', validate(loginSchema), login);
router.post('/oauth2/logout/default', authenticateToken, logout);


export default router;