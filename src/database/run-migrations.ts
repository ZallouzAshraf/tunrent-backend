import 'dotenv/config';
import dataSource from './data-source';
import { isSupabaseHost, resolveDatabasePort } from '../config/database.config';

function assertMigrationConnection(): void {
  const host = process.env.DB_HOST || 'localhost';
  const port = resolveDatabasePort(host);
  const usesTransactionPooler = port === 6543;

  if (usesTransactionPooler) {
    console.error(
      '[migrations] Supabase Transaction Pooler (6543) does not support DDL. ' +
        'Use the Session Pooler on port 5432 instead (same DB_HOST), or a direct connection.',
    );
    process.exit(1);
  }

  if (host.includes('pooler.supabase.com')) {
    console.log(
      '[migrations] Supabase Session Pooler detected (port 5432, DDL supported)',
    );
  } else if (isSupabaseHost(host)) {
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
      const [{ exists }] = await dataSource.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'users'
        ) AS exists`,
      );

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
