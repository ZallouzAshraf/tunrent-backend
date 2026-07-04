import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sqlPath = join(root, 'tmp-schema.sql');
const outPath = join(root, 'src/database/migrations/1730000000000-InitialSchema.ts');

const raw = readFileSync(sqlPath, 'utf8');

const statements = raw
  .replace(/\\restrict[^\n]*\n/g, '')
  .replace(/\\unrestrict[^\n]*\n/g, '')
  .split(/;\r?\n/)
  .map((s) =>
    s
      .split('\n')
      .filter(
        (line) =>
          !line.startsWith('--') &&
          !line.startsWith('SET ') &&
          !line.startsWith('SELECT pg_catalog') &&
          !line.startsWith('COMMENT ON') &&
          line.trim().length > 0,
      )
      .join('\n')
      .trim(),
  )
  .filter(Boolean);

const downStatements = [
  'DROP TABLE IF EXISTS "plan_change_requests" CASCADE',
  'DROP TABLE IF EXISTS "refresh_tokens" CASCADE',
  'DROP TABLE IF EXISTS "reviews" CASCADE',
  'DROP TABLE IF EXISTS "payments" CASCADE',
  'DROP TABLE IF EXISTS "notifications" CASCADE',
  'DROP TABLE IF EXISTS "car_availability_blocks" CASCADE',
  'DROP TABLE IF EXISTS "bookings" CASCADE',
  'DROP TABLE IF EXISTS "cars" CASCADE',
  'DROP TABLE IF EXISTS "agency_users" CASCADE',
  'DROP TABLE IF EXISTS "audit_logs" CASCADE',
  'DROP TABLE IF EXISTS "agencies" CASCADE',
  'DROP TABLE IF EXISTS "users" CASCADE',
  'DROP TYPE IF EXISTS "plan_change_requests_status_enum" CASCADE',
  'DROP TYPE IF EXISTS "plan_change_requests_requested_plan_enum" CASCADE',
  'DROP TYPE IF EXISTS "plan_change_requests_current_plan_enum" CASCADE',
  'DROP TYPE IF EXISTS "payments_type_enum" CASCADE',
  'DROP TYPE IF EXISTS "payments_status_enum" CASCADE',
  'DROP TYPE IF EXISTS "payments_method_enum" CASCADE',
  'DROP TYPE IF EXISTS "notifications_type_enum" CASCADE',
  'DROP TYPE IF EXISTS "cars_transmission_enum" CASCADE',
  'DROP TYPE IF EXISTS "cars_status_enum" CASCADE',
  'DROP TYPE IF EXISTS "cars_fuel_type_enum" CASCADE',
  'DROP TYPE IF EXISTS "cars_category_enum" CASCADE',
  'DROP TYPE IF EXISTS "bookings_status_enum" CASCADE',
  'DROP TYPE IF EXISTS "bookings_source_enum" CASCADE',
  'DROP TYPE IF EXISTS "bookings_cancelled_by_enum" CASCADE',
  'DROP TYPE IF EXISTS "agency_users_status_enum" CASCADE',
  'DROP TYPE IF EXISTS "agency_users_role_enum" CASCADE',
  'DROP TYPE IF EXISTS "agencies_status_enum" CASCADE',
  'DROP TYPE IF EXISTS "agencies_plan_enum" CASCADE',
  'DROP TYPE IF EXISTS "agencies_governorate_enum" CASCADE',
  'DROP TYPE IF EXISTS "users_role_global_enum" CASCADE',
];

const escape = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

const upBody = statements.map((s) => `    await queryRunner.query(\`${escape(s)}\`);`).join('\n');
const downBody = downStatements
  .map((s) => `    await queryRunner.query(\`${s}\`);`)
  .join('\n');

const content = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
${upBody}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
${downBody}
  }
}
`;

writeFileSync(outPath, content, 'utf8');
console.log(`Wrote ${statements.length} statements to ${outPath}`);
