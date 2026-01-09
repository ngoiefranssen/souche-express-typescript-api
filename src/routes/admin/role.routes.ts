import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware';
import { createRoleSchema, deleteRoleSchema, getRoleSchema, listRoleSchema, updateRoleSchema } from '../../schemas/admin/roles.schema';
import { createRole, deleteRole, getRole, listRoles, updateRole } from '../../controllers/admin/role.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';


const router = Router();

router.post('/create', authenticateToken, validate(createRoleSchema), createRole);
router.get('/list/default', authenticateToken, validate(listRoleSchema), listRoles);
router.get('/:id', authenticateToken, validate(getRoleSchema), getRole);
router.patch('/:id', authenticateToken, validate(updateRoleSchema), updateRole);
router.delete('/:id', authenticateToken, validate(deleteRoleSchema), deleteRole);

export default router;