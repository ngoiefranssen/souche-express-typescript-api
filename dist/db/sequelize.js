"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const env_1 = require("./config/env");
const sequelize = new sequelize_typescript_1.Sequelize({
    dialect: 'postgres',
    host: env_1.env.DB_HOST,
    port: Number(env_1.env.DB_PORT),
    username: env_1.env.DB_USER,
    password: env_1.env.DB_PASSWORD,
    database: env_1.env.DB_NAME,
    logging: env_1.env.NODE_ENV === 'development' ? console.log : false,
    models: [__dirname + '/../models'],
    define: {
        timestamps: true,
        underscored: false,
        createdAt: 'date_creation',
        updatedAt: 'date_mise_a_jour',
    },
});
exports.default = sequelize;
