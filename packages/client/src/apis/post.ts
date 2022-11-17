import { either, function as fp } from 'fp-ts';
import type { GroupStatus, Post } from 'nft-bbs-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const get = async (params: { groupId: GroupStatus['id'], trxId: string, viewer?: string }) => {
  const item = await request<Post>({
    url: `${API_BASE_URL}/post/${params.groupId}/${params.trxId}`,
    params: { viewer: params.viewer },
  });
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      if (v.response?.status !== 404) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};

export const getFirst = async (params: { groupId: GroupStatus['id'], userAddress: string, viewer?: string }) => {
  const item = await request<Post>({
    url: `${API_BASE_URL}/post/${params.groupId}/first`,
    params: {
      userAddress: params.userAddress,
      viewer: params.viewer,
    },
  });
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      if (v.response?.status !== 404) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};

export const list = async (groupId: GroupStatus['id'], options: {
  order?: 'asc' | 'desc'
  viewer?: string
  userAddress?: string
  offset?: number
  limit?: number
  search?: string
  hot?: 'week' | 'month' | 'year' | 'all'
} = {}) => {
  const item = await request<Array<Post>>({
    url: `${API_BASE_URL}/post/${groupId}`,
    params: options,
  });
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};

export const getCount = async (groupId: GroupStatus['id'], userAddress: string) => {
  const item = await request<number>({
    url: `${API_BASE_URL}/post/count/${groupId}/${userAddress}`,
  });

  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};
