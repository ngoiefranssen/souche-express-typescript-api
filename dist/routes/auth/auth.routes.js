"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_schema_1 = require("../../schemas/auth/auth.schema");
const auth_controller_1 = require("../../controllers/auth/auth.controller");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const router = (0, express_1.Router)();
router.post('/oauth2/default/authorize', (0, validation_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
exports.default = router;
