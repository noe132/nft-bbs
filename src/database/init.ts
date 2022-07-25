import Dexie from 'dexie';
import Database, { DATABASE_NAME } from './database';

let database = null as Database | null;

export const getDatabase = () => database!;

export const init = async () => {
  if (database) {
    return database;
  }

  database = new Database();
  await database.open();

  return database;
};

export const exists = async () => {
  const exists = await Dexie.exists(DATABASE_NAME);
  return exists;
};
