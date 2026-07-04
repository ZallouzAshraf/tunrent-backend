import { registerAs } from '@nestjs/config';

export function resolveDatabaseSsl(host: string): boolean | { rejectUnauthorized: false } {
  if (process.env.DB_SSL === 'false') {
    return false;
  }

  if (process.env.DB_SSL === 'true') {
    return { rejectUnauthorized: false };
  }

  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!isLocal && process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }

  return false;
}

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  name: process.env.DB_NAME || 'car_rental_tn',
  ssl: resolveDatabaseSsl(process.env.DB_HOST || 'localhost'),
}));
