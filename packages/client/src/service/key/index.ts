import { action, observable } from 'mobx';
import { ethers } from 'ethers';
import * as TE from 'fp-ts/lib/TaskEither';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';

export interface Keys {
  privateKey: string
  keystore: string
  password: string
  address: string
}

const state = observable({
  privateKey: '',
  keystore: '',
  password: '',
  address: '',
} as Keys);

const validate = async (keystore: string, password: string) => {
  const validate = pipe(
    TE.tryCatch(
      () => ethers.Wallet.fromEncryptedJson(keystore, password),
      (v) => v as Error,
    ),
    TE.map((v) => ({
      keystore,
      password,
      address: v.address,
      privateKey: v.privateKey,
    })),
  );
  return validate();
};

const use = action((data: Keys) => {
  state.privateKey = data.privateKey;
  state.keystore = data.keystore;
  state.password = data.password;
  state.address = data.address;
});

const login = async (keystore: string, password: string) => pipe(
  await validate(keystore, password),
  E.map((v) => {
    use(v);
    return v;
  }),
);

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
  use(keys);
  return keys;
};

const logout = action(() => {
  state.privateKey = '';
  state.keystore = '';
  state.password = '';
  state.address = '';
});

export const keyService = {
  state,

  login,
  loginRandom,
  createRandom,
  logout,
  validate,
};
