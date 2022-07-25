import { IContent } from 'quorum-light-node-sdk';
import { getDatabase } from '../init';
import { IProfile, IProfileTrxContent } from './types';

export const getTrxContent = (content: IContent) => JSON.parse(content.Data.content) as IProfileTrxContent;

export const bulkPut = async (profiles: IProfile[]) => {
  const db = getDatabase();
  await db.profiles.bulkPut(profiles);
};

export const bulkGet = async (params: Array<{ groupId: string, userAddress: string }>) => {
  const db = getDatabase();
  const queries = params.map((p) => Object.values(p));
  return db.profiles.where('[groupId+userAddress]').anyOf(queries).toArray();
};
