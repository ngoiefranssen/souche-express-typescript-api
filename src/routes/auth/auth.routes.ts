import { Router } from 'express';
import { loginSchema } from '../../schemas/auth/auth.schema';
import { oauthAuthorize, oauthLogout } from '../../controllers/auth/auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/oauth2/signin/authorized', validate(loginSchema), oauthAuthorize);
router.post('/singout/oauth2/authorized', authenticateToken, oauthLogout);


export default router;  