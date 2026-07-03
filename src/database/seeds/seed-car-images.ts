/**
 * Applique les images /cars/*.webp aux voitures existantes de l'agence.
 *
 * Usage:
 *   npm run seed:car-images
 *   SEED_AGENCY_SLUG=ashraf-agence npm run seed:car-images
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { Car } from '../../modules/cars/entities/car.entity';
import { Agency } from '../../modules/agencies/entities/agency.entity';
import { entities } from '../database.module';
import { carImagePayload } from './car-images';

config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const agencySlug = process.env.SEED_AGENCY_SLUG || 'ashraf-agence';

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'car_rental_tn',
    entities,
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const agencyRepo = dataSource.getRepository(Agency);
    const carRepo = dataSource.getRepository(Car);

    const agency = await agencyRepo.findOne({ where: { slug: agencySlug } });
    if (!agency) {
      throw new Error(`Agence introuvable (slug="${agencySlug}")`);
    }

    const cars = await carRepo.find({
      where: { agencyId: agency.id },
      order: { registrationNumber: 'ASC' },
    });

    if (cars.length === 0) {
      console.log('Aucune voiture à mettre à jour.');
      return;
    }

    const modelCounters = new Map<string, number>();

    for (const car of cars) {
      const key = `${car.brand}|${car.model}`;
      const index = modelCounters.get(key) ?? 0;
      modelCounters.set(key, index + 1);

      const { photos, thumbnailUrl } = carImagePayload(
        car.brand,
        car.model,
        index,
      );

      car.photos = photos;
      car.thumbnailUrl = thumbnailUrl;
    }

    await carRepo.save(cars);

    console.log(
      `✅ Images appliquées sur ${cars.length} voiture(s) — "${agency.name}"`,
    );
    for (const [key, count] of modelCounters) {
      console.log(`   · ${key}: ${count}`);
    }
    console.log(
      '\nℹ️  Images sans modèle exact (i20, Dzire) : visuels proches du dossier public/cars/',
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Mise à jour images échouée:', err.message ?? err);
  process.exit(1);
});
