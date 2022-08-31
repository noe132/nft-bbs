import type { GroupInfo } from 'nft-bbs-server';
import request from '~/request';
import { API_BASE_URL } from './common';

export const get = async (groupId: string) => {
  const data: GroupInfo = await request(`${API_BASE_URL}/groupinfo/${groupId}`);
  return data;
};
