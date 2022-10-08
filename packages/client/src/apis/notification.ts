import { either, function as fp } from 'fp-ts';
import type { Notification } from 'nft-bbs-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const list = async (params: { groupId: string, userAddress: string, limit: number, offset: number }) => {
  const { groupId, userAddress, limit, offset } = params;
  const item = await request<Array<Notification>>({
    url: `${API_BASE_URL}/notification/${groupId}/${userAddress}`,
    params: { limit, offset },
  });
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};

export const getUnreadCount = async (groupId: string, userAddress: string) => {
  const item = await request<number>({
    url: `${API_BASE_URL}/notification/${groupId}/${userAddress}/unread_count`,
  });
  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};
