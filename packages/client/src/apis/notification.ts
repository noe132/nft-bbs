import { either, function as fp } from 'fp-ts';
import type { GroupStatus, Notification } from 'rum-port-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';


interface NotificationListParam {
  groupId: GroupStatus['id']
  userAddress: string
  limit: number
  offset: number
}

export const list = async (params: NotificationListParam) => {
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

export const getUnreadCount = async (groupId: GroupStatus['id'], userAddress: string) => {
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
