import type { GroupStatus } from 'rum-port-server';
import { API_BASE_URL } from './common';

export const getImageUrl = (groupId: GroupStatus['id'], trxId: string) => {
  const url = `${API_BASE_URL}/image/${groupId}/${trxId}`;
  return url;
};
