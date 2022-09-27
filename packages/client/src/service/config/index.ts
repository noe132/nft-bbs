import { action, observable, runInAction } from 'mobx';
import { either } from 'fp-ts';
import { ConfigApi } from '~/apis';

const state = observable({
  inited: false,
  mixinLogin: false,
  checkNFT: false,
});

const init = () => {
  ConfigApi.getConfig().then((v) => {
    if (either.isLeft(v)) { return; }
    runInAction(() => {
      const { checkNFT, mixinLogin } = v.right;
      state.mixinLogin = mixinLogin;
      state.checkNFT = checkNFT;
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
