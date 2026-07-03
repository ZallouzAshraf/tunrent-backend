/**
 * Seed 20 voitures pour une agence existante.
 *
 * Usage:
 *   npm run seed:cars
 *   SEED_AGENCY_SLUG=ashraf-agence npm run seed:cars
 *   SEED_AGENCY_SLUG=ashraf-agence SEED_FORCE=true npm run seed:cars
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { Car } from '../../modules/cars/entities/car.entity';
import { Agency } from '../../modules/agencies/entities/agency.entity';
import { CarStatus } from '../../common/enums';
import { entities } from '../database.module';
import { AGENCY_CARS_SEED } from './agency-cars.seed-data';
import { carImagePayload } from './car-images';

config({ path: resolve(__dirname, '../../../.env') });

const DEFAULT_PICKUP = {
  city: 'Zarzis',
  address: 'Hassi jerbi, Zarzis',
  lat: 33.5034,
  lng: 11.1121,
};

async function main() {
  const agencySlug = process.env.SEED_AGENCY_SLUG || 'ashraf-agence';
  const force = process.env.SEED_FORCE === 'true';

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
      throw new Error(
        `Agence introuvable (slug="${agencySlug}"). ` +
          'Créez l\'agence ou définissez SEED_AGENCY_SLUG.',
      );
    }

    const existing = await carRepo.count({ where: { agencyId: agency.id } });
    if (existing > 0 && !force) {
      console.log(
        `⚠️  L'agence "${agency.name}" a déjà ${existing} voiture(s). ` +
          'Utilisez SEED_FORCE=true pour ajouter quand même.',
      );
      return;
    }

    const pickupLocations = [
      {
        city: agency.city || DEFAULT_PICKUP.city,
        address: agency.address || DEFAULT_PICKUP.address,
        lat: agency.latitude ?? DEFAULT_PICKUP.lat,
        lng: agency.longitude ?? DEFAULT_PICKUP.lng,
      },
    ];

    const modelCounters = new Map<string, number>();

    const cars = AGENCY_CARS_SEED.map((row) => {
      const key = `${row.brand}|${row.model}`;
      const index = modelCounters.get(key) ?? 0;
      modelCounters.set(key, index + 1);
      const images = carImagePayload(row.brand, row.model, index);

      return carRepo.create({
        agencyId: agency.id,
        brand: row.brand,
        model: row.model,
        year: row.year,
        color: row.color,
        registrationNumber: row.registrationNumber,
        vin: row.vin,
        category: row.category,
        transmission: row.transmission,
        fuelType: row.fuelType,
        seats: row.seats,
        doors: 4,
        hasAc: true,
        hasBluetooth: true,
        hasUsb: true,
        hasGps: false,
        hasChildSeat: false,
        hasInsurance: true,
        mileage: 25000 + row.year * 100,
        pricePerDay: row.pricePerDay,
        pricePerWeek: row.pricePerDay * 6,
        depositAmount: 500,
        minRentalDays: 1,
        minDriverAge: 21,
        status: CarStatus.AVAILABLE,
        photos: images.photos,
        thumbnailUrl: images.thumbnailUrl,
        description: `${row.brand} ${row.model} ${row.year} — ${row.transmission === 'automatic' ? 'Boîte auto' : 'Boîte manuelle'}, climatisée.`,
        pickupLocations,
      });
    });

    await carRepo.save(cars);

    const auto = cars.filter((c) => c.transmission === 'automatic').length;
    const manual = cars.length - auto;

    console.log(`✅ ${cars.length} voitures ajoutées pour "${agency.name}" (${agency.slug})`);
    console.log(`   → ${manual} manuelle(s), ${auto} automatique(s)`);
    console.log(
      `   → Prix: ${Math.min(...cars.map((c) => Number(c.pricePerDay)))}–${Math.max(...cars.map((c) => Number(c.pricePerDay)))} TND/jour`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Seed échoué:', err.message ?? err);
  process.exit(1);
});
