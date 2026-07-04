/**
 * Active une agence pour la marketplace (statut ACTIVE).
 *
 * Usage:
 *   npm run seed:activate-agency
 *   SEED_AGENCY_SLUG=ashraf-agence npm run seed:activate-agency
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AgencyStatus } from '../../common/enums';
import { Agency } from '../../modules/agencies/entities/agency.entity';
import { entities } from '../database.module';

config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const agencySlug = process.env.SEED_AGENCY_SLUG || 'ashraf-agence';

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_rental_tn',
    entities,
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(Agency);
    const agency = await repo.findOne({ where: { slug: agencySlug } });

    if (!agency) {
      throw new Error(`Agence introuvable (slug="${agencySlug}")`);
    }

    if (agency.status === AgencyStatus.ACTIVE) {
      console.log(`✅ "${agency.name}" est déjà active sur la marketplace.`);
      return;
    }

    agency.status = AgencyStatus.ACTIVE;
    agency.rejectionReason = null;
    await repo.save(agency);

    console.log(
      `✅ "${agency.name}" (${agency.slug}) activée — visible sur /agencies et /cars`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Activation échouée:', err.message ?? err);
  process.exit(1);
});
