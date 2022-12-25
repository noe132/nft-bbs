import '~/utils/bootstrap';
import { DataSource } from 'typeorm';

const inTSNode = !!(process as any)[Symbol.for('ts-node.register.instance')];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'e72a7e3456874163b3b715297be8a731',
  database: process.env.DB_DATABASE || 'port',
  synchronize: false,
  logging: false,
  migrationsRun: true,
  subscribers: [],
  connectTimeoutMS: 60 * 1000,
  // glob root is process.cwd()
  entities: inTSNode
    ? ['./orm/entity/*.ts']
    : ['./dist/orm/entity/*.js'],
  migrations: inTSNode
    ? ['./orm/migrations/*.ts']
    : ['./dist/orm/migrations/*.js'],
});
