import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { parse } from 'query-string';
import { toUint8Array } from 'js-base64';
import { either, taskEither, function as fp, task } from 'fp-ts';
import { utils } from 'quorum-light-node-sdk';
import type { GroupInfo, GroupStatus } from 'nft-bbs-server';
import {
  Button, Checkbox, CircularProgress, Dialog, FormControl,
  FormControlLabel, IconButton, InputLabel, OutlinedInput, Tooltip,
} from '@mui/material';
import { ChevronLeft, Close, Delete, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import bgImg1x from '~/assets/images/rum_barrel_bg.jpg';
import bgImg2x from '~/assets/images/rum_barrel_bg@2x.jpg';
import bgImg3x from '~/assets/images/rum_barrel_bg@3x.jpg';
import rumsystemLogo from '~/assets/icons/rumsystem.svg';
import RumLogo from '~/assets/icons/logo.png';
import RumLogo2x from '~/assets/icons/logo@2x.png';
import RumLogo3x from '~/assets/icons/logo@3x.png';

import { chooseImgByPixelRatio, getLoginState, runLoading, setLoginState, ThemeLight, useWiderThan } from '~/utils';
import { dialogService, keyService, nodeService, routerService, snackbarService } from '~/service';
import { GroupAvatar, Scrollable } from '~/components';
import { GroupInfoApi, VaultApi } from '~/apis';

enum Step {
  SelectGroup = 1,
  PrepareJoinGroup = 2,
}

export const Join = observer(() => {
  const state = useLocalObservable(() => ({
    selectedGroup: null as null | GroupStatus,

    keystorePopup: false,
    mixinLogin: false,
    keystore: '',
    password: '',
    passwordVisibility: false,
    rememberPassword: false,
    step: Step.SelectGroup,
    languageMenu: false,
    createWalletLoading: false,
    groupInfo: null as null | GroupInfo,

    keystoreLoginLoading: false,
    crpytoKey: null as CryptoKey | null,
    keyInHex: '',

    get config() {
      return nodeService.config.get(this.selectedGroup?.id);
    },
    get groupName() {
      const seedUrl = this.selectedGroup?.mainSeedUrl;
      return seedUrl ? utils.restoreSeedFromUrl(seedUrl).group_name : '';
    },
    get canLogin() {
      return !!this.password && !!this.keystore;
    },
  }));
  const isPC = useWiderThan(960);

  const handleNextStep = () => {
    if (state.step === Step.SelectGroup) {
      const groupId = state.selectedGroup?.id;
      if (!groupId) { return; }
      GroupInfoApi.get(groupId).then(action((v) => {
        state.groupInfo = v;
      }));
      runInAction(() => {
        state.step = Step.PrepareJoinGroup;
      });
    }
  };

  const joinGroup = () => {
    const group = state.selectedGroup;
    if (!group) { return; }
    try {
      nodeService.group.join(group);
      setLoginState({ groupId: group.id });
      runInAction(() => {
        nodeService.state.init.page = 'main';
      });
      routerService.navigate({ page: 'postlist' });
      return true;
    } catch (e: any) {
      snackbarService.error(e.message);
      return false;
    }
  };

  const handleLoginByRandom = async () => {
    const group = state.selectedGroup;
    if (!group) { return; }
    const keys = await keyService.createRandom('123');
    keyService.useKeystore(keys);
    setLoginState({
      autoLogin: 'keystore',
      groupId: group.id,
      ...keys,
    });
    joinGroup();
  };

  const handleLoginBySaved = (type: 'keystore' | 'mixin') => {
    const mixin = keyService.state.saved.mixin?.data;
    if (type === 'mixin' && mixin) {
      keyService.useMixin(mixin);
      setLoginState({ autoLogin: 'mixin' });
    }

    const keystore = keyService.state.saved.keystore?.data;
    if (type === 'keystore' && keystore) {
      keyService.useKeystore(keystore);
      setLoginState({ autoLogin: 'keystore' });
    }
  };

  const handleClearSavedLogin = async (type: 'keystore' | 'mixin') => {
    const confirm = await dialogService.open({
      title: '清除保存的登录',
      content: '确实要清除保存的登录状态吗',
    });
    if (confirm === 'cancel') { return; }
    if (type === 'mixin') {
      setLoginState({
        mixinJWT: '',
      });
    }

    if (type === 'keystore') {
      setLoginState({
        keystore: '',
        password: '',
        privateKey: '',
        address: '',
      });
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
        // window.open('/mixin-login.html');
        window.open(`https://vault.rumsystem.net/v1/oauth/mixin/login?state=${state.keyInHex}&return_to=${encodeURIComponent(`${window.location.origin}/mixin-login.html`)}`);
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
    const groupId = state.selectedGroup?.id;
    if (!groupId) { return; }
    setLoginState({
      autoLogin: 'mixin',
      mixinJWT: userResult.jwt,
      groupId,
    });
    keyService.useMixin(userResult);
    joinGroup();
  };

  const handleShowKeystoreDialog = action(() => {
    const loginState = getLoginState();
    state.keystorePopup = true;
    state.keystore = loginState.keystore;
    state.password = loginState.password;
    state.rememberPassword = state.canLogin;
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

        const groupId = state.selectedGroup?.id;
        if (!groupId) { return; }

        setLoginState({
          autoLogin: state.rememberPassword ? 'keystore' : null,
          groupId,
          ...state.rememberPassword ? data : {
            keystore: '',
            password: '',
            privateKey: '',
            address: '',
          },
        });
        joinGroup();
      },
    );
  };

  const handleAnonymous = () => {
    joinGroup();
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

  const keystore = keyService.state.saved.keystore;
  const mixin = keyService.state.saved.mixin;

  return (<>
    <div className="min-h-[100vh] flex-col">
      <a
        className="block fixed top-12 left-12"
        target="_blank"
        rel="noopener"
        href="https://rumsystem.net/"
      >
        <img
          className="fixed top-12 left-12 flex-none w-8 h-auto"
          src={RumLogo}
          srcSet={`${RumLogo2x} 2x, ${RumLogo3x} 3x,`}
          alt=""
        />
      </a>
      <div
        className="flex-col flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
        }}
      >
        <div className="flex flex-center flex-1 px-8">
          <div className="relative flex-col flex-center bg-black/80 w-[720px] rounded-[10px]">
            {state.step === Step.SelectGroup && (
              <div className="flex-col flex-none flex-center py-12">
                <div className="text-white text-18">
                  加入 Port 种子网络
                </div>
                {!!nodeService.state.groups.length && !nodeService.state.config.seedUrl && (
                  <div className="flex-col items-center mt-8 text-white gap-y-4">
                    <div className="text-white/80">可加入的种子网络</div>
                    <Scrollable className="max-h-[200px]" light size="large">
                      <div className="flex flex-wrap justify-center gap-4 px-4">
                        {/* {Array(20).fill(state.groups).flatMap((v) => v).map((v, i) => ( */}
                        {nodeService.state.groups.map((v) => (
                          <button
                            className="bg-white/20 hover:bg-white/30 rounded-full px-4 py-2"
                            key={v.id}
                            onClick={action(() => {
                              state.selectedGroup = v;
                              handleNextStep();
                            })}
                          >
                            {v.shortName || utils.restoreSeedFromUrl(v.mainSeedUrl).group_name}
                          </button>
                        ))}
                      </div>
                    </Scrollable>
                  </div>
                )}
              </div>
            )}
            {state.step === Step.PrepareJoinGroup && (
              <div className="flex-col items-center py-12 px-6">
                <Button
                  className="flex flex-center absolute left-2 top-2 text-14 font-normal text-gray-9c"
                  variant="text"
                  color="inherit"
                  onClick={action(() => { state.step = Step.SelectGroup; })}
                >
                  <ChevronLeft className="text-24 -mt-px" />
                  返回
                </Button>
                <GroupAvatar
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3"
                  groupName={state.groupName}
                  avatar={state.groupInfo?.avatar}
                  size={100}
                />
                <div className="mt-12 text-gray-f2 text-18 truncate max-w-[400px]">
                  {state.groupName}
                </div>

                <div className="mt-2 text-gray-f2 text-14 truncate-3 max-w-[400px]">
                  {state.groupInfo?.desc}
                </div>

                <div className="flex-col items-stertch mt-4 gap-y-4 min-w-[200px]">
                  {!!keystore && (
                    <div className="relative flex items-center gap-x-2">
                      <Tooltip title="用上次登录使用的keystore登录" placement="right">
                        <Button
                          className="text-link-soft rounded-full text-14 px-8 py-2 normal-case flex-1 max-w-[350px]"
                          color="inherit"
                          variant="outlined"
                          disabled={keystore.loading}
                          onClick={() => handleLoginBySaved('keystore')}
                        >
                          <span className="truncate">
                            上次使用的 keystore{' '}
                            {keystore.data ? '(' : ''}
                            {keystore.data?.address.slice(0, 10)}
                            {keystore.data ? ')' : ''}
                          </span>
                          {keystore.loading && (
                            <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip title="清除保存的keystore" placement="right">
                        <IconButton
                          className="absolute right-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                          color="inherit"
                          onClick={() => handleClearSavedLogin('keystore')}
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
                          disabled={mixin.loading}
                          onClick={() => handleLoginBySaved('mixin')}
                        >
                          <span className="truncate">
                            上次使用的 mixin 账号{' '}
                            {mixin.data ? '(' : ''}
                            {mixin.data?.user.display_name}
                            {mixin.data ? ')' : ''}
                          </span>
                          {mixin.loading && (
                            <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip title="清除保存的 mixin 账号" placement="right">
                        <IconButton
                          className="absolute right-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                          color="inherit"
                          onClick={() => handleClearSavedLogin('mixin')}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                  {state.config.mixin && (
                    <Tooltip title="使用 Mixin 账号登录" placement="right">
                      <Button
                        className="text-rum-orange rounded-full text-16 px-8 py-2 normal-case"
                        color="inherit"
                        variant="outlined"
                        onClick={handleOpenMixinLogin}
                      >
                        使用 Mixin 扫码登录
                      </Button>
                    </Tooltip>
                  )}
                  {state.config.keystore && (
                    <Tooltip title="创建一个随机账号" placement="right">
                      <Button
                        className="text-rum-orange rounded-full text-16 px-8 py-2"
                        color="inherit"
                        variant="outlined"
                        onClick={handleLoginByRandom}
                      >
                        使用随机账号登录
                      </Button>
                    </Tooltip>
                  )}
                  {state.config.keystore && (
                    <Tooltip title="输入 keystore 和 密码" placement="right">
                      <Button
                        className="text-rum-orange rounded-full text-16 px-8 py-2 normal-case"
                        color="inherit"
                        variant="outlined"
                        onClick={handleShowKeystoreDialog}
                      >
                        输入 keystore
                      </Button>
                    </Tooltip>
                  )}
                  {state.config.anonymous && (
                    <Button
                      className="text-rum-orange rounded-full text-16 px-8 py-2 normal-case"
                      color="inherit"
                      variant="outlined"
                      onClick={handleAnonymous}
                    >
                      游客模式
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center px-10 h-12 bg-white">
        <img src={rumsystemLogo} alt="" />
        <span className="px-2">·</span>
        <div className="flex flex-center gap-x-12 text-14">
          {[
            ['https://rumsystem.net/', '关于'],
            // ['https://rumsystem.net/developers', '文档'],
            // ['https://rumsystem.net/faq/howtocreateseednet', '怎样创建 RumPot 种子网络？'],
          ].map((v, i) => (
            <a
              className="text-black"
              target="_blank"
              rel="noopener"
              href={v[0]}
              key={i}
            >
              {v[1]}
            </a>
          ))}
        </div>
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
                disabled={!state.canLogin}
                loading={state.keystoreLoginLoading}
              >
                确定
              </LoadingButton>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        classes={{ paper: 'mx-0 h-full' }}
        disableScrollLock
        open={state.mixinLogin}
        onClose={action(() => { state.mixinLogin = false; })}
      >
        {true && (
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
                  src={`https://vault.rumsystem.net/v1/oauth/mixin/login?state=${state.keyInHex}&return_to=${encodeURIComponent(`${window.location.origin}/mixin-login.html`)}`}
                />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </ThemeLight>
  </>);
});
