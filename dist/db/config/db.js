"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.pool = new pg_1.Pool({
    host: env_1.env.DB_HOST,
    port: env_1.env.DB_PORT,
    user: env_1.env.DB_USER,
    password: env_1.env.DB_PASSWORD,
    database: env_1.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pool.on('connect', () => {
    console.log('Connexion à PostgreSQL établie');
});
exports.pool.on('error', (err) => {
    console.error('Erreur PostgreSQL:', err);
    process.exit(-1);
});
