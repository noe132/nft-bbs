import { DataSource } from 'typeorm';
import { config } from '../config';

const inTSNode = !!(process as any)[Symbol.for('ts-node.register.instance')];

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
  entities: inTSNode
    ? ['./orm/entity/*.ts']
    : ['./dist/orm/entity/*.js'],
  migrations: inTSNode
    ? ['./orm/migrations/*.ts']
    : ['./dist/orm/migrations/*.js'],
});
