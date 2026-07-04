import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  if (process.env.MIGRATIONS_RUN === 'false') {
    console.log('[migrations] skipped (MIGRATIONS_RUN=false)');
    return;
  }

  console.log('[migrations] connecting...');
  await dataSource.initialize();

  try {
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
