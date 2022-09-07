import { action, observable } from 'mobx';
import { ethers } from 'ethers';
import { taskEither, either, function as fp } from 'fp-ts';
import { socketService } from '../socket';

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

const use = action((data: Keys) => {
  socketService.authenticate(data.address);
  state.privateKey = data.privateKey;
  state.keystore = data.keystore;
  state.password = data.password;
  state.address = data.address;
});

const logout = action(() => {
  socketService.logout();
  state.privateKey = '';
  state.keystore = '';
  state.password = '';
  state.address = '';
});

const login = async (keystore: string, password: string) => fp.pipe(
  await validate(keystore, password),
  either.map((v) => {
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

export const keyService = {
  state,

  login,
  loginRandom,
  createRandom,
  logout,
  validate,
};
