import qs from 'query-string';
import type { Post } from 'nft-bbs-server';
import request from '~/request';
import { API_BASE_URL } from './common';

export const get = async (params: { groupId: string, trxId: string, viewer?: string }) => {
  try {
    const item: Post = await request(`${API_BASE_URL}/post/${params.groupId}/${params.trxId}?${qs.stringify({ viewer: params.viewer })}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};

export const getFirst = async (params: { groupId: string, userAddress: string, viewer?: string }) => {
  const query = {
    userAddress: params.userAddress,
    viewer: params.viewer,
  };
  try {
    const item: Post = await request(`${API_BASE_URL}/post/${params.groupId}/first?${qs.stringify(query)}`);
    return item;
  } catch (e: any) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};

export const list = async (groupId: string, options: {
  order?: 'asc' | 'desc'
  viewer?: string
  userAddress?: string
  offset?: number
  limit?: number
} = {}) => {
  const items: Array<Post> = await request(`${API_BASE_URL}/post/${groupId}?${qs.stringify(options)}`);
  return items;
};

export const getCount = async (groupId: string, userAddress: string) => {
  const count: number = await request(`${API_BASE_URL}/post/count/${groupId}/${userAddress}`);
  return count;
};
