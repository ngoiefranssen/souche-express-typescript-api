import { Router } from 'express';
import { validate } from '../../middlewares/validation.middleware';
import { createRoleSchema, deleteRoleSchema, getRoleSchema, listRoleSchema, updateRoleSchema } from '../../schemas/admin/roles.schema';
import { createRole, deleteRole, getRole, listRoles, updateRole } from '../../controllers/admin/Role.controller';


const router = Router();

router.post('/create', validate(createRoleSchema), createRole);
router.get('/list/default', validate(listRoleSchema), listRoles);
router.get('/:id', validate(getRoleSchema), getRole);
router.patch('/:id', validate(updateRoleSchema), updateRole);
router.delete('/:id', validate(deleteRoleSchema), deleteRole);

export default router;