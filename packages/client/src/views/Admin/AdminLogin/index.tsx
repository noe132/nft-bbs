import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { parse } from 'query-string';
import { toUint8Array } from 'js-base64';
import { either, taskEither, function as fp, task } from 'fp-ts';
import {
  Button, Checkbox, CircularProgress, Dialog, FormControl,
  FormControlLabel, IconButton, InputLabel, Modal, OutlinedInput, Tooltip,
} from '@mui/material';
import { Close, Delete, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import { runLoading, ThemeLight, useWiderThan } from '~/utils';
import { keyService, loginStateService, snackbarService } from '~/service';
import { VaultApi } from '~/apis';

export const AdminLogin = observer(() => {
  const state = useLocalObservable(() => ({
    keystorePopup: false,
    mixinLogin: false,
    keystore: '',
    password: '',
    passwordVisibility: false,
    rememberPassword: false,
    createWalletLoading: false,

    crpytoKey: null as CryptoKey | null,
    keyInHex: '',

    loading: false,

    keystoreLoginLoading: false,
  }));
  const isPC = useWiderThan(960);
  const loginState = loginStateService.state.groups.admin;
  const keystore = loginState?.keystore;
  const mixin = loginState?.mixin;

  const handleLoginBySavedKeystore = action(() => {
    if (keystore) {
      keyService.useKeystore(keystore);
      loginStateService.state.groups.admin = {
        ...loginStateService.state.groups.admin,
        keystore: { ...keystore },
        lastLogin: 'keystore',
      };
    }
  });

  const handleClearSavedKeystore = () => {
    const item = loginStateService.state.groups.admin;
    if (item) {
      delete item.keystore;
      if (item.lastLogin === 'keystore') {
        item.lastLogin = null;
      }
    }
  };

  const handleLoginBySavedMixin = async () => {
    if (!mixin) { return; }
    const jwt = mixin.mixinJWT;
    await fp.pipe(
      () => VaultApi.getOrCreateAppUser(jwt),
      taskEither.matchW(
        () => {
          snackbarService.error('登录失败');
          runInAction(() => { state.mixinLogin = false; });
        },
        action((data) => {
          loginStateService.state.groups.admin = {
            ...loginStateService.state.groups.admin,
            mixin: {
              mixinJWT: jwt,
              userName: data.user.display_name,
            },
            lastLogin: 'mixin',
          };
          keyService.useMixin(data);
        }),
      ),
    )();
  };

  const handleClearSavedMixin = () => {
    const item = loginStateService.state.groups.admin;
    if (item) {
      delete item.mixin;
      if (item.lastLogin === 'mixin') {
        item.lastLogin = null;
      }
    }
  };

  const handleOpenMixinLogin = async () => {
    const aesKey = await window.crypto.subtle.generateKey({
      name: 'AES-GCM',
      length: 256,
    }, true, ['encrypt', 'decrypt']);
    const keyBuffer = await window.crypto.subtle.exportKey('raw', aesKey);
    const keyInHex = Array.from(new Uint8Array(keyBuffer)).map((v) => `0${v.toString(16)}`.slice(-2)).join('');
    runInAction(() => {
      state.crpytoKey = aesKey;
      state.keyInHex = keyInHex;
      if (isPC) {
        state.mixinLogin = true;
      } else {
        window.open(VaultApi.getMixinOauthUrl({
          state: state.keyInHex,
          return_to: `${window.location.origin}/mixin-login.html`,
        }));
      }
    });
  };

  const handleMixinLoginCallback = async (search: string) => {
    const crpytoKey = state.crpytoKey;
    if (!crpytoKey) { return; }
    const parseSearch = taskEither.tryCatch(async () => {
      const query = parse(search);
      const cipher = new Uint8Array(toUint8Array(query.token as string));
      const iv = cipher.slice(0, 12);
      const data = cipher.slice(12);
      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        crpytoKey,
        data,
      );
      const jwt = new TextDecoder().decode(plain);
      return jwt;
    }, (v) => v as Error);

    const userResult = await fp.pipe(
      parseSearch,
      taskEither.chainW((jwt) => () => VaultApi.getOrCreateAppUser(jwt)),
      taskEither.getOrElseW(() => {
        snackbarService.error('登录失败');
        runInAction(() => { state.mixinLogin = false; });
        return task.of(null);
      }),
    )();

    if (!userResult) { return; }

    runInAction(() => {
      loginStateService.state.groups.admin = {
        ...loginStateService.state.groups.admin,
        mixin: {
          mixinJWT: userResult.jwt,
          userName: userResult.user.display_name,
        },
        lastLogin: 'mixin',
      };
    });
    keyService.useMixin(userResult);
  };

  const handleShowKeystoreDialog = action(() => {
    const loginState = loginStateService.state.groups.admin?.keystore;
    state.keystorePopup = true;
    state.keystore = loginState?.keystore ?? '';
    state.password = loginState?.password ?? '';
    state.rememberPassword = false;
  });

  const handleLoginConfirm = () => {
    if (state.keystoreLoginLoading) { return; }
    runLoading(
      (l) => { state.keystoreLoginLoading = l; },
      async () => {
        const result = await keyService.validate(state.keystore, state.password);
        if (either.isLeft(result)) {
          snackbarService.error('keystore或密码错误');
          return;
        }
        const data = result.right;
        keyService.useKeystore(data);

        runInAction(() => {
          loginStateService.state.groups.admin = {
            ...loginStateService.state.groups.admin,
            keystore: { ...data },
            lastLogin: 'keystore',
          };
        });
      },
    );
  };

  const handleCreateNewWallet = () => {
    if (!state.password) {
      runInAction(() => {
        state.password = '123';
        state.passwordVisibility = true;
      });
    }
    runLoading(
      (l) => { state.createWalletLoading = l; },
      async () => {
        const data = await keyService.createRandom(state.password);
        runInAction(() => {
          state.keystore = data.keystore;
        });
        snackbarService.show('已创建新钱包，请保存好keystore和密码。');
      },
    );
  };

  useEffect(() => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const loginState = loginStateService.state.groups.admin;
        if (loginState?.lastLogin === 'keystore' && loginState.keystore) {
          keyService.useKeystore(loginState.keystore);
        }
        if (loginState?.lastLogin === 'mixin' && loginState.mixin) {
          const jwt = loginState.mixin.mixinJWT;
          return fp.pipe(
            () => keyService.validateMixin(jwt),
            taskEither.chain((v) => taskEither.fromIO(() => keyService.useMixin(v))),
          )();
        }
      },
    );
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'mixin-login-callback' && e.newValue) {
        handleMixinLoginCallback(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  return (<>
    <div className="flex flex-center bg-black/70 h-[100vh]">
      <Modal className="flex flex-center" open={state.loading}>
        <CircularProgress className="outline-none" />
      </Modal>
      <div className="flex-col items-stertch mt-4 gap-y-4 min-w-[200px]">
        {!!keystore && (
          <div className="relative flex items-center gap-x-2">
            <Tooltip title="用上次登录使用的keystore登录" placement="right">
              <Button
                className="text-link-soft rounded-full text-14 px-8 py-2 normal-case flex-1 max-w-[350px]"
                color="inherit"
                variant="outlined"
                onClick={handleLoginBySavedKeystore}
              >
                <span className="truncate">
                  上次使用的 keystore{' '}
                  ({keystore.address.slice(0, 10)})
                </span>
                {/* {keystore.loading && (
                  <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                )} */}
              </Button>
            </Tooltip>
            <Tooltip title="清除保存的keystore" placement="right">
              <IconButton
                className="absolute right-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                color="inherit"
                onClick={handleClearSavedKeystore}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </div>
        )}

        {!!mixin && (
          <div className="relative flex items-center gap-x-2">
            <Tooltip title="用上次登录使用的 mixin账号登录" placement="right">
              <Button
                className="text-link-soft rounded-full text-14 px-8 py-2 normal-case flex-1 max-w-[350px]"
                color="inherit"
                variant="outlined"
                // disabled={mixin.loading}
                onClick={handleLoginBySavedMixin}
              >
                <span className="truncate">
                  上次使用的 mixin 账号{' '}
                  ({mixin.userName})
                </span>
                {/* {mixin.loading && (
                  <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                )} */}
              </Button>
            </Tooltip>
            <Tooltip title="清除保存的 mixin 账号" placement="right">
              <IconButton
                className="absolute right-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                color="inherit"
                onClick={handleClearSavedMixin}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </div>
        )}

        <Tooltip title="使用 Mixin 账号登录" placement="right">
          <Button
            className="text-rum-orange rounded-full text-16 px-8 py-2"
            color="inherit"
            variant="outlined"
            onClick={handleOpenMixinLogin}
          >
            使用 Mixin 扫码登录
          </Button>
        </Tooltip>

        <Tooltip title="输入 keystore 和 密码" placement="right">
          <Button
            className="text-rum-orange rounded-full text-16 px-8 py-2"
            color="inherit"
            variant="outlined"
            onClick={handleShowKeystoreDialog}
          >
            输入 keystore
          </Button>
        </Tooltip>
      </div>
    </div>

    <ThemeLight>
      <Dialog
        open={state.keystorePopup}
        onClose={action(() => { if (!state.keystoreLoginLoading) { state.keystorePopup = false; } })}
      >
        <div className="flex-col relative text-black w-[400px]">
          <IconButton
            className="absolute top-2 right-2"
            onClick={action(() => { if (!state.keystoreLoginLoading) { state.keystorePopup = false; } })}
            disabled={state.keystoreLoginLoading}
          >
            <Close />
          </IconButton>
          <div className="flex-col flex-1 justify-between items-center p-6 gap-y-6">
            <div className="text-18">
              注册/登录
            </div>
            <div className="flex-col gap-y-4 w-[250px] items-stretch">
              <FormControl size="small">
                <InputLabel>keystore</InputLabel>
                <OutlinedInput
                  size="small"
                  label="keystore"
                  type="text"
                  multiline
                  rows={5}
                  value={state.keystore}
                  onChange={action((e) => { state.keystore = e.target.value; })}
                  disabled={state.keystoreLoginLoading}
                />
              </FormControl>
              <FormControl size="small">
                <InputLabel>密码</InputLabel>
                <OutlinedInput
                  size="small"
                  label="密码"
                  type={state.passwordVisibility ? 'text' : 'password'}
                  value={state.password}
                  onChange={action((e) => { state.password = e.target.value; })}
                  disabled={state.keystoreLoginLoading}
                  endAdornment={(
                    <IconButton
                      className="-mr-2"
                      size="small"
                      onClick={action(() => { state.passwordVisibility = !state.passwordVisibility; })}
                    >
                      {state.passwordVisibility && (<Visibility className="text-20" />)}
                      {!state.passwordVisibility && (<VisibilityOff className="text-20" />)}
                    </IconButton>
                  )}
                />
              </FormControl>
              <FormControlLabel
                className="flex-center"
                label="记住 keystore 和 密码"
                control={(
                  <Checkbox
                    checked={state.rememberPassword}
                    onChange={action((_, v) => { state.rememberPassword = v; })}
                    disabled={state.keystoreLoginLoading}
                  />
                )}
              />
            </div>
            <div className="flex gap-x-4">
              <LoadingButton
                className="rounded-full text-16 px-10 py-2"
                color="primary"
                variant="outlined"
                onClick={handleCreateNewWallet}
                loading={state.createWalletLoading}
                disabled={state.keystoreLoginLoading}
              >
                创建新钱包
              </LoadingButton>
              <LoadingButton
                className="rounded-full text-16 px-10 py-2"
                color="link"
                variant="outlined"
                onClick={handleLoginConfirm}
                loading={state.keystoreLoginLoading}
              >
                确定
              </LoadingButton>
            </div>
          </div>
        </div>
      </Dialog>
      <Dialog
        classes={{
          paper: 'mx-0 h-full',
        }}
        disableScrollLock
        open={state.mixinLogin}
        onClose={action(() => { state.mixinLogin = false; })}
      >
        <div className="flex-col relative text-black h-full">
          <IconButton
            className="absolute top-2 right-2"
            onClick={action(() => { state.mixinLogin = false; })}
          >
            <Close />
          </IconButton>
          <div className="flex-col flex-1 justify-between items-center p-6 gap-y-6">
            <div className="text-18">
              Mixin
            </div>
            <div className="flex-col flex-1 gap-y-4 items-stretch">
              <iframe
                className="w-[450px] h-full"
                src={VaultApi.getMixinOauthUrl({
                  state: state.keyInHex,
                  return_to: `${window.location.origin}/mixin-login.html`,
                })}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </ThemeLight>
  </>);
});
