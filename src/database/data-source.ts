import 'dotenv/config';
import { DataSource } from 'typeorm';
import { entities } from './database.module';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'tunrent',
  password: process.env.DB_PASSWORD || 'tunrent',
  database: process.env.DB_NAME || 'car_rental_tn',
  entities,
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
