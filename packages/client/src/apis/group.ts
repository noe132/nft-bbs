import { either, function as fp } from 'fp-ts';
import type { GroupStatus } from 'nft-bbs-server/orm';

import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { AdminApiParams, API_BASE_URL } from './common';

export const list = async () => {
  const item = await request<Array<GroupStatus>>({
    url: `${API_BASE_URL}/group`,
    method: 'get',
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};

type AddGroupParams = AdminApiParams & Pick<GroupStatus, 'shortName' | 'mainSeedUrl' | 'commentSeedUrl' | 'counterSeedUrl' | 'profileSeedUrl'>;

export const add = async (params: AddGroupParams) => {
  const item = await request<GroupStatus>({
    url: `${API_BASE_URL}/group/add`,
    method: 'post',
    data: params,
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

export const del = async (groupId: GroupStatus['id']) => {
  const item = await request<{ status: 0 }>({
    url: `${API_BASE_URL}/group/delete`,
    method: 'post',
    data: { id: groupId },
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

type UpdateKeys = 'id' | 'shortName' | 'mainSeedUrl' | 'commentSeedUrl' | 'counterSeedUrl' | 'profileSeedUrl';
type UpdateGroupParams = AdminApiParams & Pick<GroupStatus, UpdateKeys>;

export const update = async (params: UpdateGroupParams) => {
  const item = await request<GroupStatus>({
    url: `${API_BASE_URL}/group/update`,
    method: 'post',
    data: params,
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
