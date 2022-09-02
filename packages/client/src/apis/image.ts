import { API_BASE_URL } from './common';

export const getImageUrl = (groupId: string, trxId: string) => {
  const url = `${API_BASE_URL}/image/${groupId}/${trxId}`;
  return url;
};
