import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: '.env' });

async function seed() {
  console.log('Environment check:');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_USERNAME:', process.env.DB_USER);
  console.log('DB_DATABASE:', process.env.DB_DATABASE);
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'event_management',
    entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  try {
    const result = await dataSource.query(
      `INSERT INTO users (id, name, email, password, role, created_at, updated_at)
       VALUES (
         gen_random_uuid(),
         $1,
         $2,
         $3,
         'admin',
         CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP
       )
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email;`,
      ['System Administrator', adminEmail, hashedPassword],
    );

    if (result.length > 0) {
      console.log(`✅ Admin user created: ${result[0].email}`);
    } else {
      console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}
