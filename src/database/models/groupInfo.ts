import { IContent } from 'quorum-light-node-sdk';
import { getDatabase } from '../init';
import { IGroupInfoTrxContent, IGroupInfo } from './types';

export const getTrxContent = (content: IContent) => JSON.parse(content.Data.content) as IGroupInfoTrxContent;

export const create = async (comment: IGroupInfo) => {
  const db = getDatabase();
  await db.groupInfo.add(comment);
};

export const getLatest = async () => {
  const db = getDatabase();
  return db.groupInfo.orderBy('timestamp').last();
};

export const bulkGet = async (trxIds: string[]) => {
  const db = getDatabase();
  return db.groupInfo.where('trxId').anyOf(trxIds).toArray();
};

export const bulkPut = async (comments: IGroupInfo[]) => {
  const db = getDatabase();
  await db.groupInfo.bulkPut(comments);
};
