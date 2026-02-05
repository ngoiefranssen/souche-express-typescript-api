import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import userAllRoutes from './admin/users.routes';
import profilAllRoutes from './admin/profil.routes';
import statutEmployeAllRoutes from './admin/statut_employe.routes';
import rolesAllRoutes from './admin/role.routes';
import permissionsAllRoutes from './admin/permissions.routes';
import auditAllRoutes from './audit/audit';

const mainRouter = Router();
                
// Routes auth
mainRouter.use('/auth', authRoutes);
mainRouter.use('/users', userAllRoutes);
mainRouter.use('/profils', profilAllRoutes);
mainRouter.use('/employment-statut', statutEmployeAllRoutes);
mainRouter.use('/roles', rolesAllRoutes);
mainRouter.use('/permissions', permissionsAllRoutes);
mainRouter.use('/audit', auditAllRoutes);


export const routesProvider = mainRouter;