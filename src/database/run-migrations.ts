import 'dotenv/config';
import dataSource from './data-source';
import {
  isSupabaseHost,
  resolveDatabasePort,
} from '../config/database.config';

function assertMigrationConnection(): void {
  const host = process.env.DB_HOST || 'localhost';
  const port = resolveDatabasePort(host);
  const usesPooler =
    process.env.DB_USE_POOLER === 'true' ||
    host.includes('pooler.supabase.com') ||
    port === 6543;

  if (usesPooler) {
    console.error(
      '[migrations] Supabase pooler (6543) does not support DDL. Use direct connection: DB_HOST=db.xxx.supabase.co, DB_PORT=5432, DB_USE_POOLER=false',
    );
    process.exit(1);
  }

  if (isSupabaseHost(host)) {
    console.log('[migrations] Supabase direct connection detected');
  }
}

async function runMigrations(): Promise<void> {
  if (process.env.MIGRATIONS_RUN === 'false') {
    console.log('[migrations] skipped (MIGRATIONS_RUN=false)');
    return;
  }

  assertMigrationConnection();

  console.log('[migrations] connecting...');
  await dataSource.initialize();

  try {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      const [{ exists }] = (await dataSource.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'users'
        ) AS exists`,
      )) as [{ exists: boolean }];

      if (exists) {
        console.log(
          '[migrations] dev: schema already present (synchronize) — skipping',
        );
        return;
      }
    }

    const applied = await dataSource.runMigrations();
    if (applied.length === 0) {
      console.log('[migrations] nothing pending');
    } else {
      console.log(
        `[migrations] applied: ${applied.map((m) => m.name).join(', ')}`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

runMigrations().catch((error) => {
  console.error('[migrations] failed:', error);
  process.exit(1);
});
