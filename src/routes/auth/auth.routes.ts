import { Router } from 'express';
import { loginSchema, refreshTokenSchema } from '../../schemas/auth/auth.schema';
import { 
  oauthAuthorize, 
  oauthLogout, 
  refreshAccessToken,
  getCurrentUser 
} from '../../controllers/auth/auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();

// Login - génère access + refresh token
router.post('/oauth2/signin/authorized', validate(loginSchema), oauthAuthorize);

// Logout - révoque tous les tokens
router.post('/singout/oauth2/authorized', authenticateToken, oauthLogout);

// Refresh - renouvelle l'access token
router.post('/refresh-token', validate(refreshTokenSchema), refreshAccessToken);

// Get current user - récupère les infos de l'utilisateur connecté
router.get('/me', authenticateToken, getCurrentUser);

export default router;  