import type { Profile } from 'nft-bbs-server';
import request from '~/request';
import { API_BASE_URL } from './common';

export const get = async (groupId: string, userAddress: string) => {
  try {
    const item: Profile = await request(`${API_BASE_URL}/profile/${groupId}/${userAddress}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};
