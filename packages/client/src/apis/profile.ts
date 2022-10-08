import { either, function as fp } from 'fp-ts';
import type { Profile } from 'nft-bbs-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const getByUserAddress = async (groupId: string, userAddress: string) => {
  const item = await request<Profile>({
    url: `${API_BASE_URL}/profile/${groupId}/userAddress/${userAddress}`,
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

export const getByTrxId = async (groupId: string, trxId: string) => {
  const item = await request<Profile>({
    url: `${API_BASE_URL}/profile/${groupId}/trxId/${trxId}`,
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
