import { getDatabase } from '../init';
import { IUniqueCounter } from './types';

export const bulkAdd = async (uniqueCounters: IUniqueCounter[]) => {
  const db = getDatabase();
  await db.uniqueCounters.bulkAdd(uniqueCounters);
};

export const bulkDelete = async (uniqueCounters: IUniqueCounter[]) => {
  const db = getDatabase();
  const queries = uniqueCounters.map((counter) => Object.values(counter));
  await db.uniqueCounters.where('[name+objectId+userAddress]').anyOf(queries).delete();
};

export const bulkGet = async (uniqueCounters: IUniqueCounter[]) => {
  const db = getDatabase();
  const queries = uniqueCounters.map((counter) => Object.values(counter));
  return db.uniqueCounters.where('[name+objectId+userAddress]').anyOf(queries).toArray();
};
