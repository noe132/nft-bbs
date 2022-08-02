import { getDatabase } from '../init';
import { IGroupStatus } from './types';

export const put = async (item: IGroupStatus) => {
  const db = getDatabase();
  await db.groupStatus.put(item);
};

export const get = async (groupId: string) => {
  const db = getDatabase();
  const item = await db.groupStatus.where({ groupId }).last();
  return item;
};
