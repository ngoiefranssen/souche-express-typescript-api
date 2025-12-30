import { Router } from 'express';
import { loginSchema } from '../../schemas/auth/auth.schema';
import { login } from '../../controllers/auth/auth.controller';
import { validate } from '../../middlewares/validation.middleware';

const router = Router();

router.post('/oauth2/default/authorize', validate(loginSchema), login);

export default router;