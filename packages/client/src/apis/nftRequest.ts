import { either, function as fp } from 'fp-ts';
import type { NftRequest } from 'nft-bbs-server/orm';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export interface AdminAuthParams {
  address: string
  nonce: number
  sign: string
}

export interface NFTRequestData {
  groupId: string
  memo: string
}

export const submitRequest = async (data: NFTRequestData & AdminAuthParams) => {
  const item = await request({
    url: `${API_BASE_URL}/nft/request`,
    method: 'post',
    data,
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

interface ListParams {
  offset: number
  limit: number
}

export const list = async (data: ListParams & AdminAuthParams) => {
  const item = await request<Array<NftRequest>>({
    url: `${API_BASE_URL}/nft/request/list`,
    method: 'post',
    data,
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
