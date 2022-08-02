import { action, observable } from 'mobx';
import { ethers } from 'ethers';

interface Keys {
  privateKey: string
  keystore: string
  password: string
  address: string
}

const state = observable({
  keys: {
    privateKey: '',
    keystore: '',
    password: '',
    address: '',
  } as Keys,
});

const createRandom = async (password: string) => {
  const wallet = ethers.Wallet.createRandom();
  const keystore = await wallet.encrypt(password, {
    scrypt: {
      N: 64,
    },
  });
  return {
    keystore: keystore.replaceAll('\\', ''),
    password,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

const validate = async (privateKey: string, password: string) => {
  const wallet = new ethers.Wallet(privateKey);
  const keystore = await wallet.encrypt(password, {
    scrypt: {
      N: 64,
    },
  });
  return {
    keystore: keystore.replaceAll('\\', ''),
    password,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

const use = action((data: Keys) => {
  state.keys = data;
});

const clear = action(() => {
  state.keys = {
    privateKey: '',
    keystore: '',
    password: '',
    address: '',
  };
});

export const keyService = {
  state,

  use,
  clear,
  createRandom,
  validate,
};
