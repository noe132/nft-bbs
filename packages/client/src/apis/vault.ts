import { either, function as fp, taskEither } from 'fp-ts';
import { request } from '~/request';
import { snackbarService } from '~/service/snackbar';
import { VAULT_API_BASE_URL } from './common';

const appId = 1065804423237;

export interface VaultUser {
  id: number
  created_at: string
  updated_at: string
  username: string
  display_name: string
  email: null
  phone: null
  password: null
  avatar_url: string
  mixin: {
    id: number
    created_at: string
    updated_at: string
    userid: number
    mixin_userid: string
    identity_number: string
    full_name: string
    biography: string
    phone: string
    avatar_url: string
  }
}

export interface VaultAppUser {
  app_id: number
  userid: number
  eth_address: string
  eth_pub_key: string
}

export const getUser = async (jwt: string) => {
  const item = await request<VaultUser>({
    url: `${VAULT_API_BASE_URL}/user`,
    headers: { Authorization: `Bearer ${jwt}` },
  });

  return fp.pipe(
    item,
    either.mapLeft((v) => {
      snackbarService.networkError(v);
      return v;
    }),
  );
};

export const getAppUser = async (jwt: string, userId: number) => {
  const item = await request<VaultAppUser>({
    url: `${VAULT_API_BASE_URL}/app/user`,
    params: { appid: appId, userid: userId },
    headers: { Authorization: `Bearer ${jwt}` },
  });

  return fp.pipe(
    item,
    either.mapLeft((v) => {
      if (v.response?.status === 500 && v.response.data?.message === 'record not found') {
        return 'no user' as const;
      }
      snackbarService.networkError(v);
      return 'network error' as const;
    }),
  );
};

export const createAppUser = async (jwt: string) => {
  const item = await request<VaultAppUser>({
    url: `${VAULT_API_BASE_URL}/app/user`,
    params: { appid: appId },
    method: 'post',
    headers: { Authorization: `Bearer ${jwt}` },
    data: { appid: appId },
  });

  return fp.pipe(
    item,
    either.mapLeft((v) => {
      if (v.response?.status === 500 && (v.response.data?.message ?? '').includes('Duplicate entry')) {
        return 'already created' as const;
      }
      snackbarService.networkError(v);
      return 'network error' as const;
    }),
  );
};

export const sign = async (hash: string, jwt: string) => {
  const item = await request<{
    address: string
    signature: string
  }>({
    url: `${VAULT_API_BASE_URL}/app/user/sign`,
    method: 'post',
    headers: { Authorization: `Bearer ${jwt}` },
    data: { appid: appId, hash },
  });

  return fp.pipe(
    item,
    either.getOrElseW((v) => {
      snackbarService.networkError(v);
      return null;
    }),
  );
};

export const getOrCreateAppUser = (jwt: string) => fp.pipe(
  () => getUser(jwt),
  taskEither.chainW((vaultUser) => fp.pipe(
    () => getAppUser(jwt, vaultUser.id),
    taskEither.orElseW((v) => (
      v === 'no user'
        ? () => createAppUser(jwt)
        : taskEither.left(v)
    )),
    taskEither.map((v) => ({
      appUser: v,
      user: vaultUser,
    })),
  )),
  taskEither.map((users) => ({ ...users, jwt })),
)();
