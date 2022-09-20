import { either, function as fp } from 'fp-ts';
import qs from 'query-string';
import type { Post } from 'nft-bbs-server';
import request from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const get = async (params: { groupId: string, trxId: string, viewer?: string }) => {
  const item = await request<Post>(
    `${API_BASE_URL}/post/${params.groupId}/${params.trxId}?${qs.stringify({ viewer: params.viewer })}`,
  );
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      if (v.status !== 404) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};

export const getFirst = async (params: { groupId: string, userAddress: string, viewer?: string }) => {
  const query = {
    userAddress: params.userAddress,
    viewer: params.viewer,
  };
  const item = await request<Post>(
    `${API_BASE_URL}/post/${params.groupId}/first?${qs.stringify(query)}`,
  );
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      if (v.status !== 404) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};

export const list = async (groupId: string, options: {
  order?: 'asc' | 'desc'
  viewer?: string
  userAddress?: string
  offset?: number
  limit?: number
  search?: string
} = {}) => {
  const item = await request<Array<Post>>(
    `${API_BASE_URL}/post/${groupId}?${qs.stringify(options)}`,
  );
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};

export const getCount = async (groupId: string, userAddress: string) => {
  const item = await request<number>(
    `${API_BASE_URL}/post/count/${groupId}/${userAddress}`,
  );

  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};
