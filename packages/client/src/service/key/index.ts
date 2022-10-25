import { action, observable } from 'mobx';
import { ethers, utils } from 'ethers';
import { taskEither, either, function as fp } from 'fp-ts';
import { Base64 } from 'js-base64';
import { VaultApi } from '~/apis';
import { getLoginState, setLoginState } from '~/utils';

export interface KeystoreData {
  type: 'keystore'
  privateKey: string
  keystore: string
  password: string
  address: string
}

export interface MixinData {
  type: 'mixin'
  jwt: string
  user: VaultApi.VaultUser
  appUser: VaultApi.VaultAppUser
}

const state = observable({
  keys: null as null | KeystoreData | MixinData,

  get address() {
    if (this.keys?.type === 'keystore') {
      return this.keys.address;
    }
    return this.keys?.appUser.eth_address ?? '';
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

const useKeystore = action((data: Omit<KeystoreData, 'type'>) => {
  state.keys = {
    type: 'keystore',
    privateKey: data.privateKey,
    keystore: data.keystore,
    password: data.password,
    address: data.address,
  };
});

const logout = action(() => {
  state.keys = null;
});

const login = async (keystore: string, password: string) => fp.pipe(
  await validate(keystore, password),
  either.map((v) => {
    useKeystore(v);
    return v;
  }),
);

const mixinLogin = action((jwt: string, user: VaultApi.VaultUser, appUser: VaultApi.VaultAppUser) => {
  state.keys = {
    type: 'mixin',
    jwt,
    user,
    appUser,
  };
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

const loginRandom = async (password: string) => {
  const keys = await createRandom(password);
  useKeystore(keys);
  return keys;
};

const getTrxCreateParam = () => {
  if (state.keys?.type === 'keystore') {
    return {
      privateKey: state.keys.privateKey,
    };
  }
  if (state.keys?.type === 'mixin') {
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

const tryAutoLogin = async () => {
  const loginState = getLoginState();

  if (loginState && loginState.autoLogin === 'mixin' && loginState.mixinJWT) {
    const result = await VaultApi.getOrCreateAppUser(loginState.mixinJWT);
    if (either.isRight(result)) {
      const { jwt, user, appUser } = result.right;
      keyService.mixinLogin(jwt, user, appUser);
    } else {
      setLoginState({
        mixinJWT: '',
        autoLogin: null,
      });
    }
  }

  if (loginState && loginState.autoLogin === 'keystore') {
    const loginResult = await keyService.login(loginState.keystore, loginState.password);
    if (either.isLeft(loginResult)) {
      setLoginState({
        keystore: '',
        password: '',
        autoLogin: null,
      });
    }
  }
};

export const keyService = {
  state,

  login,
  mixinLogin,
  loginRandom,
  createRandom,
  logout,
  validate,
  getTrxCreateParam,
  tryAutoLogin,
};
