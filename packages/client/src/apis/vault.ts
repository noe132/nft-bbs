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
  eth_address_user?: {
    address: string
    created_at: string
    id: number
    updated_at: string
    userid: number
  }
  mixin?: {
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
  btc_address: null
  eth_address: string
  eth_pub_key: string
}

export interface CreateUserBySignatureResponse {
  token: string
  user: VaultUser
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
        return new Error('no user');
      }
      snackbarService.networkError(v);
      return new Error('network error');
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
        return new Error('already created');
      }
      snackbarService.networkError(v);
      return new Error('network error');
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

export const createUserBySignature = async (address: string, data: string, signature: string) => {
  const item = await request<CreateUserBySignatureResponse>({
    url: `${VAULT_API_BASE_URL}/user/eth/address`,
    method: 'post',
    data: { address, data, signature },
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
      v.message === 'no user'
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
