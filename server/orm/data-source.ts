import { DataSource } from 'typeorm';
import { config } from '../config';

export const AppDataSource = new DataSource({
  type: config.database.dialect,
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.database,
  // migration only
  synchronize: false,
  logging: false,
  migrationsRun: true,
  subscribers: [],
  // glob root is process.cwd()
  entities: ['./orm/entity/*.ts'],
  migrations: ['./orm/migrations/*.ts'],
});
