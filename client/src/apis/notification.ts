import qs from 'query-string';
import type { Notification } from 'nft-bbs-server';
import request from '~/request';
import { API_BASE_URL } from './common';

export const list = async (params: { groupId: string, userAddress: string, limit: number, offset: number }) => {
  const { groupId, userAddress, limit, offset } = params;
  const items: Array<Notification> = await request(`${API_BASE_URL}/notification/${groupId}/${userAddress}?${qs.stringify({ limit, offset })}`);
  return items;
};

export const getUnreadCount = async (groupId: string, userAddress: string) => {
  const count: number = await request(`${API_BASE_URL}/notification/${groupId}/${userAddress}/unread_count`);
  return count;
};
