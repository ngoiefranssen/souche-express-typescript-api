import { Sequelize } from 'sequelize-typescript';
import { env } from './config/env';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  logging: env.NODE_ENV === 'development' ? console.log : false,
  models: [__dirname + '/../models'],
  define: {
    timestamps: true,
    underscored: false,
    createdAt: 'date_creation',
    updatedAt: 'date_mise_a_jour',
  },
});

export default sequelize;