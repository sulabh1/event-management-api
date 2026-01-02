import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Registration } from '..//modules/registrations/entities/registration.entity';
import { Event } from '..//modules/events/entities/event.entity';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? '',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? '',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? '',
  entities: [User, Event, Registration],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: process.env.DB_SYNC === 'true',
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: process.env.NODE_ENV !== 'test',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  extra: {
    max: 20,
    connectionTimeoutMillis: 10000,
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
