import qs from 'query-string';
import type { Comment } from 'nft-bbs-server';
import request from '~/request';
import { API_BASE_URL } from './common';

export const list = async (groupId: string, options: {
  objectId: string
  viewer?: string
  offset?: number
  limit?: number
}) => {
  const items: Array<Comment> = await request(`${API_BASE_URL}/comment/${groupId}?${qs.stringify(options)}`);
  return items;
};

export const get = async (params: { groupId: string, trxId: string, viewer?: string }) => {
  const { groupId, trxId, viewer } = params;
  try {
    const item: Comment = await request(`${API_BASE_URL}/comment/${groupId}/${trxId}?${qs.stringify({ viewer })}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};

export const getFirst = async (groupId: string, userAddress: string, viewer: string) => {
  try {
    const item: Comment = await request(`${API_BASE_URL}/comment/${groupId}/first?${qs.stringify({ userAddress, viewer })}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};
