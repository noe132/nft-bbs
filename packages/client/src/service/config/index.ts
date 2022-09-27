import { action, observable, runInAction } from 'mobx';
import { either } from 'fp-ts';
import { ConfigApi } from '~/apis';

const state = observable({
  inited: false,
  mixinLogin: false,
  keystoreLogin: false,
  checkNFT: false,
  seedUrl: '',
});

const init = () => {
  ConfigApi.getConfig().then((v) => {
    if (either.isLeft(v)) { return; }
    runInAction(() => {
      const { checkNFT, mixinLogin, seedUrl, keystoreLogin } = v.right;
      state.mixinLogin = mixinLogin;
      state.keystoreLogin = keystoreLogin;
      state.checkNFT = checkNFT;
      state.seedUrl = seedUrl;
    });
  }).finally(action(() => {
    state.inited = true;
  }));

  return () => {};
};

export const configService = {
  state,
  init,
};
