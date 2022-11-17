import '~/utils/bootstrap';
import { DataSource } from 'typeorm';
import { config } from '~/config';

const inTSNode = !!(process as any)[Symbol.for('ts-node.register.instance')];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: Number(config.db.port),
  username: config.db.user,
  password: config.db.password,
  database: config.db.database,
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
