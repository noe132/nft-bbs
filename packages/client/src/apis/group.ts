import { either, function as fp } from 'fp-ts';
import type { GroupStatus } from 'nft-bbs-server/orm';

import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { AdminApiParams, API_BASE_URL } from './common';

interface ListGroupParams {
  privateGroupIds?: Array<number>
  privateGroupShortNames?: Array<string>
  hideNetworkError?: boolean
}

export const list = async (params?: ListGroupParams) => {
  const item = await request<Array<GroupStatus>>({
    url: `${API_BASE_URL}/group`,
    params: {
      ...params?.privateGroupIds && params.privateGroupIds?.length ? {
        groupIds: JSON.stringify(params.privateGroupIds),
      } : {},
      ...params?.privateGroupShortNames && params.privateGroupShortNames?.length ? {
        shortNames: JSON.stringify(params.privateGroupShortNames),
      } : {},
    },
    method: 'get',
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      if (!params?.hideNetworkError) {
        snackbarService.networkError(v);
      }
      return null;
    }),
  );
};

export const listAll = async (data: AdminApiParams) => {
  const item = await request<Array<GroupStatus>>({
    url: `${API_BASE_URL}/group/all`,
    data,
    method: 'post',
  });
  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};

export const joinBySeedurl = async (seedUrl: string) => {
  const item = await request<GroupStatus>({
    url: `${API_BASE_URL}/group/join_private`,
    method: 'post',
    data: { seedUrl },
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

export const del = async (params: AdminApiParams & { id: GroupStatus['id'] }) => {
  const item = await request<{ status: 0 }>({
    url: `${API_BASE_URL}/group/delete`,
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

export const repolling = async (params: AdminApiParams & { id: GroupStatus['id'] }) => {
  const item = await request<{ status: 0 }>({
    url: `${API_BASE_URL}/group/repolling`,
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
