import { action, observable, runInAction } from 'mobx';
import { function as fp, taskEither } from 'fp-ts';
import { ConfigApi } from '~/apis';

const state = observable({
  inited: false,
  configLoaded: false,
  mixinLogin: false,
  keystoreLogin: false,
  checkNFT: false,
  seedUrl: '',
});

export const loadConfig = fp.pipe(
  taskEither.fromIO(() => state.configLoaded),
  taskEither.chainW((loaded) => {
    if (loaded) {
      return taskEither.of(null);
    }
    return fp.pipe(
      ConfigApi.getConfig,
      taskEither.map((v) => {
        runInAction(() => {
          const { checkNFT, mixinLogin, seedUrl, keystoreLogin } = v;
          state.mixinLogin = mixinLogin;
          state.keystoreLogin = keystoreLogin;
          state.checkNFT = checkNFT;
          state.seedUrl = seedUrl;
          state.configLoaded = true;
        });
        return null;
      }),
    );
  }),
);

const init = () => {
  loadConfig().finally(action(() => {
    state.inited = true;
  }));

  return () => {};
};

export const configService = {
  state,
  init,
  loadConfig,
};
