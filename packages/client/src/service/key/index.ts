import { action, observable } from 'mobx';
import { ethers, utils } from 'ethers';
import { taskEither, function as fp } from 'fp-ts';
import { Base64 } from 'js-base64';
import * as rumsdk from 'rum-sdk-browser';

import { VaultApi } from '~/apis';

export interface KeystoreData {
  privateKey: string
  keystore: string
  password: string
  address: string
}

export interface MixinData {
  jwt: string
  user: VaultApi.VaultUser
  appUser: VaultApi.VaultAppUser
}

export interface MetaMaskData {
  jwt: string
  user: VaultApi.VaultUser
  appUser: VaultApi.VaultAppUser
}

type KeysData = (KeystoreData & { type: 'keystore' })
| (MixinData & { type: 'mixin' }
| (MetaMaskData & { type: 'metamask' }));

const state = observable({
  keys: null as null | KeysData,

  get address() {
    if (this.keys?.type === 'keystore') {
      return this.keys.address;
    }
    if (this.keys?.type === 'mixin') {
      return this.keys?.appUser.eth_address ?? '';
    }
    if (this.keys?.type === 'metamask') {
      return this.keys?.appUser.eth_address ?? this.keys?.user.eth_address_user?.address ?? '';
    }
    return '';
  },
  get logined() {
    return !!this.address;
  },
});

const validate = async (keystore: string, password: string) => {
  const doValidate = fp.pipe(
    taskEither.tryCatch(
      () => ethers.Wallet.fromEncryptedJson(keystore, password),
      (v) => v as Error,
    ),
    taskEither.map((v) => ({
      keystore,
      password,
      address: v.address,
      privateKey: v.privateKey,
    })),
  );
  return doValidate();
};

const validateMixin = async (jwt: string) => VaultApi.getOrCreateAppUser(jwt);

const useKeystore = action((data: KeystoreData) => {
  state.keys = {
    type: 'keystore',
    privateKey: data.privateKey,
    keystore: data.keystore,
    password: data.password,
    address: data.address,
  };
});

const useMixin = action((data: MixinData) => {
  state.keys = {
    type: 'mixin',
    ...data,
  };
});

const useMetaMask = action((data: MetaMaskData) => {
  state.keys = {
    type: 'metamask',
    ...data,
  };
});

const logout = action(() => {
  state.keys = null;
});

const createRandom = async (password: string) => {
  const wallet = ethers.Wallet.createRandom();
  const keystore = await wallet.encrypt(password, { scrypt: { N: 64 } });
  const keys = {
    keystore: keystore.replaceAll('\\', ''),
    password,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
  return keys;
};

const getTrxCreateParam = () => {
  if (state.keys?.type === 'keystore') {
    return {
      privateKey: state.keys.privateKey,
    };
  }
  if (state.keys?.type === 'mixin' || state.keys?.type === 'metamask') {
    const jwt = state.keys.jwt;
    const compressedPublicKey = utils.arrayify(utils.computePublicKey(state.keys.appUser.eth_pub_key, true));
    const publicKey = Base64.fromUint8Array(compressedPublicKey, true);
    return {
      publicKey,
      sign: async (m: string) => {
        const res = await VaultApi.sign(`0x${m}`, jwt);
        if (!res) { throw new Error(); }
        return res.signature.replace(/^0x/, '');
      },
    };
  }
  throw new Error('not logined');
};

const sign = async (data: string) => {
  const dataUint8 = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('sha-256', dataUint8);
  const digestInHex = rumsdk.utils.typeTransform.uint8ArrayToHex(new Uint8Array(digest));
  const signInHex = await rumsdk.utils.sign(digestInHex, getTrxCreateParam());
  return signInHex;
};

const getAdminSignParam = async () => {
  const address = state.address;
  const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const signInHex = await sign(`${address}-${nonce}`);
  return { address, nonce, sign: signInHex };
};

export const keyService = {
  state,

  useKeystore,
  useMixin,
  useMetaMask,
  createRandom,
  logout,
  validate,
  validateMixin,
  getTrxCreateParam,
  getSignParams: getAdminSignParam,
  sign,
};
