import { either, function as fp } from 'fp-ts';
import type { Comment, GroupStatus } from 'nft-bbs-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const list = async (groupId: GroupStatus['id'], options: {
  objectId: string
  viewer?: string
  offset?: number
  limit?: number
}) => {
  const item = await request<Array<Comment>>({
    url: `${API_BASE_URL}/comment/${groupId}`,
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

export const get = async (params: { groupId: GroupStatus['id'], trxId: string, viewer?: string }) => {
  const { groupId, trxId, viewer } = params;
  const item = await request<Comment>({
    url: `${API_BASE_URL}/comment/${groupId}/${trxId}`,
    params: { viewer },
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

export const getFirst = async (groupId: GroupStatus['id'], userAddress: string, viewer: string) => {
  const item = await request<Comment>({
    url: `${API_BASE_URL}/comment/${groupId}/first`,
    params: { userAddress, viewer },
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
