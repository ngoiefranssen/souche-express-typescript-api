"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../../controllers/admin/users.controller");
const users_schema_1 = require("../../schemas/admin/users.schema");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const router = (0, express_1.Router)();
// ======================== ROUTES UTILISATEURS ========================
router.post('/register/default', (0, validation_middleware_1.validate)(users_schema_1.registerSchema), users_controller_1.registerUser);
router.get('/all/data/default', (0, validation_middleware_1.validate)(users_schema_1.listUsersSchema), users_controller_1.listUsers);
router.get('/one/data/:id', (0, validation_middleware_1.validate)(users_schema_1.getUserSchema), users_controller_1.getUser);
router.patch('/updated/data/:id', (0, validation_middleware_1.validate)(users_schema_1.updateUserSchema), users_controller_1.updateUser);
router.delete('/removeded/one/data/:id', (0, validation_middleware_1.validate)(users_schema_1.deleteUserSchema), users_controller_1.deleteUser);
exports.default = router;
