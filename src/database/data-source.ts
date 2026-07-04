import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  resolveDatabasePort,
  resolveDatabaseSsl,
} from '../config/database.config';
import { entities } from './database.module';

const host = process.env.DB_HOST || 'localhost';

export default new DataSource({
  type: 'postgres',
  host,
  port: resolveDatabasePort(host),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'postgres',
  ssl: resolveDatabaseSsl(host),
  entities,
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
