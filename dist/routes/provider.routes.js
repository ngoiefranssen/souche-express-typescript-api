"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routesProvider = void 0;
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const users_routes_1 = __importDefault(require("./admin/users.routes"));
const profil_routes_1 = __importDefault(require("./admin/profil.routes"));
const statut_employe_routes_1 = __importDefault(require("./admin/statut.employe.routes"));
const mainRouter = (0, express_1.Router)();
// Routes auth
mainRouter.use('/dif', auth_routes_1.default);
mainRouter.use('/users', users_routes_1.default);
mainRouter.use('/profils', profil_routes_1.default);
mainRouter.use('/statut-employe', statut_employe_routes_1.default);
exports.routesProvider = mainRouter;
