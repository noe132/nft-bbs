import { either, function as fp } from 'fp-ts';
import type { GroupStatus, Profile } from 'rum-port-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const getByUserAddress = async (groupId: GroupStatus['id'], userAddress: string) => {
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

export const getByTrxId = async (groupId: GroupStatus['id'], trxId: string) => {
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

interface SetTempProfileParams {
  groupId: GroupStatus['id']
  name: string
  avatar: string

  address: string
  sign: string
  nonce: number
}

export const setTempProfile = async (data: SetTempProfileParams) => {
  const item = await request<Profile>({
    url: `${API_BASE_URL}/profile/temp`,
    method: 'post',
    data,
  });

  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
    }),
  );
};
