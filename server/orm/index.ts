import { AppDataSource } from './data-source';

export * from './entity';

export const initDB = async () => {
  try {
    await AppDataSource.initialize();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
