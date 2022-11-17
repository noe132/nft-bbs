import { either, function as fp } from 'fp-ts';
import type { GroupConfig } from 'nft-bbs-server';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { AdminApiParams, API_BASE_URL } from './common';

export interface SiteConfig {
  group: Record<GroupConfig['groupId'], GroupConfig>
  defaultGroup: Pick<GroupConfig, 'keystore' | 'mixin' | 'anonymous'>
  admin: Array<string>
}

export const getConfig = async () => {
  const item = await request<SiteConfig>({
    url: `${API_BASE_URL}/config`,
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return v;
    }),
  );
};

export const list = async (params: AdminApiParams) => {
  const item = await request<Array<GroupConfig>>({
    url: `${API_BASE_URL}/config/list`,
    method: 'post',
    data: params,
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return v;
    }),
  );
};

export const set = async (params: AdminApiParams & GroupConfig) => {
  const item = await request<SiteConfig>({
    url: `${API_BASE_URL}/config/set`,
    method: 'post',
    data: params,
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return v;
    }),
  );
};

export const del = async (params: AdminApiParams & { groupId: GroupConfig['groupId'] }) => {
  const item = await request<SiteConfig>({
    url: `${API_BASE_URL}/config/delete`,
    method: 'post',
    data: params,
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return v;
    }),
  );
};
