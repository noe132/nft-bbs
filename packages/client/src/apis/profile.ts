import type { Profile } from 'nft-bbs-server';
import request from '~/request';
import { API_BASE_URL } from './common';

export const getByUserAddress = async (groupId: string, userAddress: string) => {
  try {
    const item: Profile = await request(`${API_BASE_URL}/profile/${groupId}/userAddress/${userAddress}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};

export const getByTrxId = async (groupId: string, trxId: string) => {
  try {
    const item: Profile = await request(`${API_BASE_URL}/profile/${groupId}/trxId/${trxId}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};
