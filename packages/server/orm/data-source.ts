import '~/utils/bootstrap';
import { DataSource } from 'typeorm';

const inTSNode = !!(process as any)[Symbol.for('ts-node.register.instance')];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.db_host ?? '127.0.0.1',
  port: Number(process.env.db_port) || 5432,
  username: process.env.db_user ?? 'nft-bbs',
  password: process.env.db_password ?? '2578644fdccf4e6c9648ac0d2661bb5b',
  database: process.env.db_database ?? 'postgres',
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
