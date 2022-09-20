import { either, function as fp } from 'fp-ts';
import type { GroupInfo } from 'nft-bbs-server';
import request from '~/request';
import { snackbarService } from '~/service/snackbar';
import { API_BASE_URL } from './common';

export const get = async (groupId: string) => fp.pipe(
  await request<GroupInfo>(`${API_BASE_URL}/groupinfo/${groupId}`),
  either.getOrElseW((v) => {
    snackbarService.networkError(v);
    return null;
  }),
);
