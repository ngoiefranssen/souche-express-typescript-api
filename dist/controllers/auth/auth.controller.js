"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../../db/config/db");
const env_1 = require("../../db/config/env");
const errors_1 = require("../../utils/errors");
const login = async (req, res, next) => {
    try {
        const { email, password } = req?.body;
        const result = await db_1.pool.query('SELECT id, email, password, name FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            throw new errors_1.AppError(401, 'Email ou mot de passe incorrect');
        }
        const user = result.rows[0];
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new errors_1.AppError(401, 'Email ou mot de passe incorrect');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRE });
        res.json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                token,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
