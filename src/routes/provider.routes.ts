import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userAllRoutes from './admin/users.routes';
import profilAllRoutes from './admin/profil.routes';
import statutEmployeAllRoutes from './admin/statut.employe.routes';
import rolesAllRoutes from './admin/role.routes';

const mainRouter = Router();

// Routes auth
mainRouter.use('/dif', authRoutes);
mainRouter.use('/users', userAllRoutes);
mainRouter.use('/profils', profilAllRoutes);
mainRouter.use('/statut-employe', statutEmployeAllRoutes);
mainRouter.use('/roles', rolesAllRoutes);

export const routesProvider = mainRouter;