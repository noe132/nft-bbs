import { IContent } from 'quorum-light-node-sdk';
import { getDatabase } from '../init';
import { ICounter, ICounterTrxContent } from './types';

export const getTrxContent = (content: IContent) => JSON.parse(content.Data.content) as ICounterTrxContent;

export const create = async (counter: ICounter) => {
  const db = getDatabase();
  await db.counters.add(counter);
};

export const bulkAdd = async (counters: ICounter[]) => {
  const db = getDatabase();
  await db.counters.bulkAdd(counters);
};

export const bulkGet = (trxIds: string[]) => {
  const db = getDatabase();
  return db.counters.where('trxId').anyOf(trxIds).toArray();
};

export const get = (trxId: string) => {
  const db = getDatabase();
  return db.counters.where({ trxId }).last();
};
