/**
 * Crée ou met à jour le compte super admin (développement / staging).
 *
 * Usage:
 *   npm run seed:admin
 *   SEED_ADMIN_EMAIL=admin@admin.com SEED_ADMIN_PASSWORD=secret npm run seed:admin
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { RoleGlobal } from '../../common/enums';
import { User } from '../../modules/users/entities/user.entity';
import { entities } from '../database.module';

const BCRYPT_ROUNDS = 12;

config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@admin.com')
    .toLowerCase()
    .trim();
  const password = process.env.SEED_ADMIN_PASSWORD || '123456789';

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
    const repo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user = await repo.findOne({ where: { email } });

    if (user) {
      user.roleGlobal = RoleGlobal.SUPER_ADMIN;
      user.passwordHash = passwordHash;
      user.isEmailVerified = true;
      user.isActive = true;
      user.firstName = user.firstName || 'Super';
      user.lastName = user.lastName || 'Admin';
      await repo.save(user);
      console.log(`✅ Compte admin mis à jour : ${email}`);
    } else {
      user = repo.create({
        firstName: 'Super',
        lastName: 'Admin',
        email,
        passwordHash,
        roleGlobal: RoleGlobal.SUPER_ADMIN,
        isEmailVerified: true,
        isActive: true,
      });
      await repo.save(user);
      console.log(`✅ Compte admin créé : ${email}`);
    }

    console.log(`   Rôle : ${RoleGlobal.SUPER_ADMIN}`);
    console.log(`   Panel : /admin (après connexion sur /login)`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Seed admin échoué:', err.message ?? err);
  process.exit(1);
});
