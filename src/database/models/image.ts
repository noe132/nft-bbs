import { IContent } from 'quorum-light-node-sdk';
import { getDatabase } from '../init';
import { IImage, IImageTrxContent } from './types';

export const getTrxContent = (content: IContent) => JSON.parse(content.Data.content) as IImageTrxContent;

export const get = async (trxId: string) => {
  const db = getDatabase();
  return db.images.where({ trxId }).last();
};

export const bulkGet = async (trxIds: Array<string>) => {
  const db = getDatabase();
  return db.images.where('trxId').anyOf(trxIds).toArray();
};

export const bulkAdd = async (images: Array<IImage>) => {
  const db = getDatabase();
  await db.images.bulkAdd(images);
};

export const bulkPut = async (images: Array<IImage>) => {
  const db = getDatabase();
  await db.images.bulkPut(images);
};
