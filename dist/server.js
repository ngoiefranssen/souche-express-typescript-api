"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const errors_1 = require("./utils/errors");
const provider_routes_1 = require("./routes/provider.routes");
const env_1 = require("./db/config/env");
const app = (0, express_1.default)();
// ==================== Sécurité ====================
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.NODE_ENV === 'production' ? 'https://namedomaine.com' : '*',
    credentials: true,
}));
// ==================== Middlewares généraux ====================
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// Gestion des uploads de fichiers
app.use((0, express_fileupload_1.default)({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: '/tmp/',
    debug: false,
}));
// ==================== Health check AVANT le rate limiter ====================
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: env_1.env.NODE_ENV,
        uptime: process.uptime(),
    });
});
// ==================== Rate limiting SEULEMENT sur /api/v1 ====================
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
});
// ==================== Routes ====================
app.use('/api/v1', limiter, provider_routes_1.routesProvider);
// Debug : afficher toutes les routes
function printRoutes(stack, prefix = '') {
    stack.forEach((layer) => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            console.log(`${methods.padEnd(7)} ${prefix}${layer.route.path}`);
        }
        else if (layer.name === 'router' && layer.handle.stack) {
            const path = layer.regexp.source
                .replace('\\/?', '')
                .replace('(?=\\/|$)', '')
                .replace(/\\\//g, '/')
                .replace('^', '')
                .replace('$', '');
            printRoutes(layer.handle.stack, prefix + path);
        }
    });
}
printRoutes(app._router.stack, '');
// ==================== Gestion des erreurs ====================
// 404 - DOIT être après toutes les routes
app.use(errors_1.notFoundHandler);
// Gestionnaire d'erreurs global - TOUJOURS EN DERNIER
app.use(errors_1.errorHandler);
// ==================== Démarrage du serveur ====================
const startServer = async () => {
    try {
        const port = env_1.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Serveur démarré sur http://localhost:${port}`);
        });
    }
    catch (error) {
        console.error('Erreur lors du démarrage du serveur :', error);
        process.exit(1);
    }
};
startServer();
