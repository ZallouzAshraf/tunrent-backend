import { registerAs } from '@nestjs/config';

export function resolveDatabaseSsl(
  host: string,
): boolean | { rejectUnauthorized: false } {
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

/** Supabase pooler (port 6543) or explicit DB_USE_POOLER=true */
export function resolveDatabasePort(host: string): number {
  if (process.env.DB_PORT) {
    return parseInt(process.env.DB_PORT, 10);
  }

  if (
    process.env.DB_USE_POOLER === 'true' ||
    host.includes('pooler.supabase.com')
  ) {
    return 6543;
  }

  return 5432;
}

export default registerAs('database', () => {
  const host = process.env.DB_HOST || 'localhost';

  return {
    host,
    port: resolveDatabasePort(host),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    name: process.env.DB_NAME || 'car_rental_tn',
    ssl: resolveDatabaseSsl(host),
    migrationsRun: process.env.MIGRATIONS_RUN === 'true',
  };
});
