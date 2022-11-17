import { either, function as fp } from 'fp-ts';
import type { GroupStatus, NftRequest } from 'nft-bbs-server/orm';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export interface AdminAuthParams {
  address: string
  nonce: number
  sign: string
}

export interface NFTRequestData {
  groupId: GroupStatus['id']
  memo: string
}

export interface NFTRequestReplyData {
  id: NftRequest['id']
  type: string
  reply: NftRequest['memo']
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
  filter?: string
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

export const submitRequestReply = async (data: NFTRequestReplyData & AdminAuthParams) => {
  const item = await request({
    url: `${API_BASE_URL}/nft/request/reply`,
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
