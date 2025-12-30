"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../db/config/env");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Token manquant',
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = decoded;
        return next();
    }
    catch (error) {
        return res.status(403).json({
            status: 'error',
            message: 'Token invalide ou expiré',
        });
    }
};
exports.authenticateToken = authenticateToken;
