import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { parse } from 'query-string';
import { toUint8Array } from 'js-base64';
import { providers, utils } from 'ethers';
import { either, taskEither, function as fp } from 'fp-ts';
import { utils as quorumUtils } from 'quorum-light-node-sdk';
import RemoveMarkdown from 'remove-markdown';
import type { GroupStatus, IAppConfigItem } from 'nft-bbs-server';
import {
  Button, Checkbox, CircularProgress, Dialog, FormControl,
  FormControlLabel, IconButton, InputLabel, Modal, OutlinedInput, Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Close, Delete, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import bgImg1x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash.jpg';
import bgImg2x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@2x.jpg';
import bgImg3x from '~/assets/images/pierre-bouillot-QlCNwrdd_iA-unsplash@3x.jpg';

import { chooseImgByPixelRatio, runLoading, ThemeLight, useWiderThan } from '~/utils';
import {
  APPCONFIG_KEY_NAME, dialogService, keyService, KeystoreData,
  loginStateService, nodeService, routerService, snackbarService,
} from '~/service';
import { GroupAvatar, Scrollable, Footer } from '~/components';
import { VaultApi } from '~/apis';

export const Join = observer(() => {
  const state = useLocalObservable(() => ({
    selectedGroup: null as null | GroupStatus,

    mixinLogin: {
      group: null as null | GroupStatus,
      crpytoKey: null as CryptoKey | null,
      keyInHex: '',
      dialogOpen: false,
    },

    keystoreDialog: {
      open: false,
      group: null as null | GroupStatus,
      keystore: '',
      password: '',
      passwordVisibility: false,
      loading: false,
      createWalletLoading: false,
      remember: false,

      get valid() {
        return !!this.keystore && !!this.password;
      },
    },

    globalLoading: false,

    get selectedGroupConfig() {
      if (!state.selectedGroup) { return null; }
      return nodeService.config.get(state.selectedGroup.id);
    },
    get selectedGroupLoginState() {
      if (!state.selectedGroup) { return null; }
      const item = loginStateService.state.groups[state.selectedGroup.id];
      if (!item) { return null; }
      return item;
    },
    get groups() {
      return nodeService.state.groups.map((group) => ({
        group,
        config: nodeService.config.get(group.id),
        loginState: loginStateService.state.groups[group.id] as typeof loginStateService.state.groups[number] | undefined,
      }));
    },
  }));

  const isPC = useWiderThan(960);

  const joinGroup = (group: GroupStatus) => {
    try {
      nodeService.group.join(group);
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

  const handleOpenMixinLogin = async (group: GroupStatus) => {
    const aesKey = await window.crypto.subtle.generateKey({
      name: 'AES-GCM',
      length: 256,
    }, true, ['encrypt', 'decrypt']);
    const keyBuffer = await window.crypto.subtle.exportKey('raw', aesKey);
    const keyInHex = Array.from(new Uint8Array(keyBuffer)).map((v) => `0${v.toString(16)}`.slice(-2)).join('');
    runInAction(() => {
      state.mixinLogin.group = group;
      state.mixinLogin.crpytoKey = aesKey;
      state.mixinLogin.keyInHex = keyInHex;
      if (isPC) {
        state.mixinLogin.dialogOpen = true;
      } else {
        window.open(`https://vault.rumsystem.net/v1/oauth/mixin/login?state=${keyInHex}&return_to=${encodeURIComponent(`${window.location.origin}/mixin-login.html`)}`);
      }
    });
  };

  const handleMixinLoginCallback = async (search: string) => {
    const group = state.mixinLogin.group;
    const crpytoKey = state.mixinLogin.crpytoKey;
    if (!crpytoKey || !group) { return; }
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

    await fp.pipe(
      parseSearch,
      taskEither.matchW(
        () => snackbarService.error('登录失败'),
        (jwt) => handleLoginByMixin(group, jwt),
      ),
    )();
  };

  const handleLoginByMixin = (group: GroupStatus, jwt: string) => {
    runLoading(
      (l) => { state.globalLoading = l; },
      async () => {
        await fp.pipe(
          () => VaultApi.getOrCreateAppUser(jwt),
          taskEither.matchW(
            () => {
              snackbarService.error('登录失败');
              runInAction(() => { state.mixinLogin.dialogOpen = false; });
            },
            action((data) => {
              loginStateService.state.groups[group.id] = {
                ...loginStateService.state.groups[group.id],
                mixin: {
                  mixinJWT: jwt,
                  userName: data.user.display_name,
                },
                lastLogin: 'mixin',
              };
              loginStateService.state.autoLoginGroupId = group.id;
              keyService.useMixin(data);
              joinGroup(group);
            }),
          ),
        )();
      },
    );
  };

  const handleLoginBySavedKeystore = action((group: GroupStatus, keystore: KeystoreData) => {
    loginStateService.state.groups[group.id] = {
      ...loginStateService.state.groups[group.id],
      keystore: { ...keystore },
      lastLogin: 'keystore',
    };
    loginStateService.state.autoLoginGroupId = group.id;
    keyService.useKeystore(keystore);
    joinGroup(group);
  });

  const handleLoginByNewMetaMask = async (group: GroupStatus) => {
    if (!(window as any).ethereum) {
      const result = await dialogService.open({
        content: '请先安装 MetaMask 插件',
        cancel: '我知道了',
        confirm: '去安装',
      });
      if (result === 'confirm') {
        window.open('https://metamask.io');
      }
      return;
    }

    const run = fp.pipe(
      taskEither.tryCatch(
        async () => {
          const PREFIX = '\x19Ethereum Signed Message:\n';
          const message = `Rum 身份认证 | ${Math.round(Date.now() / 1000)}`;
          const provider = new providers.Web3Provider((window as any).ethereum);
          const accounts = await provider.send('eth_requestAccounts', []);
          const address = accounts[0];
          const messageBytes = utils.toUtf8Bytes(message);
          const msg = `0x${quorumUtils.typeTransform.uint8ArrayToHex(messageBytes)}`;
          const signatureFromProvider = await provider.send('personal_sign', [msg, address]);
          const signature = utils.joinSignature(signatureFromProvider);
          const prefixBytes = utils.toUtf8Bytes(`${PREFIX}${messageBytes.length}`);
          const bytes = utils.concat([prefixBytes, messageBytes]);
          const rawMsg = utils.toUtf8String(bytes);
          const hash = utils.keccak256(bytes).toString();
          const digest = quorumUtils.typeTransform.hexToUint8Array(hash);
          const recoveredAddress = utils.recoverAddress(digest, signature);
          if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            throw new Error('加解密的 address 不匹配');
          }
          return {
            address: recoveredAddress,
            data: rawMsg,
            signature: signature.replace('0x', ''),
          };
        },
        (e) => e as Error,
      ),
      taskEither.chainW((data) => fp.pipe(
        taskEither.fromTask(() => VaultApi.createUserBySignature(
          data.address,
          data.data,
          data.signature,
        )),
        taskEither.chainNullableK(new Error('failed to create user'))(fp.identity),
        taskEither.chain((v) => () => VaultApi.getOrCreateAppUser(v.token)),
        taskEither.map((v) => ({
          address: data.address,
          token: v.jwt,
          user: v.user,
          appUser: v.appUser,
        })),
      )),
      taskEither.map(action((v) => {
        loginStateService.state.groups[group.id] = {
          ...loginStateService.state.groups[group.id],
          lastLogin: 'metamask',
          metamask: {
            address: v.address,
            mixinJWT: v.token,
          },
        };
        keyService.useMetaMask({
          jwt: v.token,
          user: v.user,
          appUser: v.appUser,
        });
        loginStateService.state.autoLoginGroupId = group.id;
        joinGroup(group);
      })),
      taskEither.mapLeft((e) => {
        snackbarService.error(e.message);
      }),
    );
    runLoading(
      (l) => { state.globalLoading = l; },
      () => run(),
    );
  };

  const handleLoginBySavedMetaMask = (group: GroupStatus, jwt: string) => {
    const run = fp.pipe(
      () => VaultApi.getOrCreateAppUser(jwt),
      taskEither.map(action((v) => {
        loginStateService.state.groups[group.id] = {
          ...loginStateService.state.groups[group.id],
          lastLogin: 'metamask',
        };
        keyService.useMetaMask({
          jwt,
          user: v.user,
          appUser: v.appUser,
        });
        loginStateService.state.autoLoginGroupId = group.id;
        joinGroup(group);
      })),
      taskEither.mapLeft((e) => {
        snackbarService.error(e.message);
      }),
    );
    runLoading(
      (l) => { state.globalLoading = l; },
      () => run(),
    );
  };

  const handleLoginAnonymous = action((group: GroupStatus) => {
    loginStateService.state.autoLoginGroupId = null;
    joinGroup(group);
  });

  const handleLoginByRandom = async (group: GroupStatus) => {
    const keys = await keyService.createRandom('123');
    keyService.useKeystore(keys);
    loginStateService.state.groups[group.id] = {
      ...loginStateService.state.groups[group.id],
      keystore: { ...keys },
      lastLogin: 'keystore',
    };
    loginStateService.state.autoLoginGroupId = group.id;
    joinGroup(group);
  };

  const handleClearSavedLogin = (group: GroupStatus, type: 'keystore' | 'mixin' | 'metamask') => {
    if (loginStateService.state.groups[group.id]) {
      delete loginStateService.state.groups[group.id]![type];
      if (loginStateService.state.groups[group.id]?.lastLogin === type) {
        loginStateService.state.groups[group.id]!.lastLogin = null;
      }
    }
  };

  const handleShowKeystoreDialog = action((group: GroupStatus) => {
    const loginState = loginStateService.state.groups[group.id];
    state.keystoreDialog.group = group;
    state.keystoreDialog.keystore = loginState?.keystore?.keystore ?? '';
    state.keystoreDialog.password = loginState?.keystore?.password ?? '';
    state.keystoreDialog.remember = loginStateService.state.autoLoginGroupId === group.id;
    state.keystoreDialog.open = true;
    state.keystoreDialog.loading = false;
    state.keystoreDialog.createWalletLoading = false;
    state.keystoreDialog.passwordVisibility = false;
  });

  const handleCreateNewWallet = () => {
    if (!state.keystoreDialog.password) {
      runInAction(() => {
        state.keystoreDialog.password = '123';
        state.keystoreDialog.passwordVisibility = true;
      });
    }
    runLoading(
      (l) => { state.keystoreDialog.createWalletLoading = l; },
      async () => {
        const data = await keyService.createRandom(state.keystoreDialog.password);
        runInAction(() => {
          state.keystoreDialog.keystore = data.keystore;
        });
        snackbarService.show('已创建新钱包，请保存好keystore和密码。');
      },
    );
  };

  const handleLoginByKeystoreDialog = action(() => {
    const group = state.keystoreDialog.group;
    if (!group) { return; }
    if (state.keystoreDialog.loading) { return; }
    runLoading(
      (l) => { state.keystoreDialog.loading = l; },
      async () => {
        const result = await keyService.validate(
          state.keystoreDialog.keystore,
          state.keystoreDialog.password,
        );
        if (either.isLeft(result)) {
          snackbarService.error('keystore或密码错误');
          return;
        }
        const keys = result.right;
        keyService.useKeystore(keys);

        runInAction(() => {
          if (state.keystoreDialog.remember) {
            loginStateService.state.autoLoginGroupId = group.id;
            loginStateService.state.groups[group.id] = {
              ...loginStateService.state.groups[group.id],
              keystore: { ...keys },
              lastLogin: 'keystore',
            };
          } else {
            loginStateService.state.autoLoginGroupId = null;
            if (loginStateService.state.groups[group.id]) {
              loginStateService.state.groups[group.id]!.lastLogin = null;
              delete loginStateService.state.groups[group.id]!.keystore;
            }
          }
        });

        joinGroup(group);
      },
    );
  });

  const handleOpenGroup = action((group: GroupStatus) => {
    state.selectedGroup = group;
  });

  const renderDesc = (text?: IAppConfigItem['Value']) => {
    if (!text) { return ''; }
    return RemoveMarkdown(text.toString());
  };

  useEffect(() => {
    if (loginStateService.state.autoOpenGroupId) {
      const groupItem = nodeService.state.groups.find((v) => v.id === loginStateService.state.autoOpenGroupId);
      runInAction(() => {
        if (groupItem) {
          state.selectedGroup = groupItem;
        }
        loginStateService.state.autoOpenGroupId = null;
      });
    }

    // TODO: load group info when app config is available
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

  return (
    <div className="h-[100vh] flex-col">
      <Modal className="flex flex-center" open={state.globalLoading}>
        <CircularProgress />
      </Modal>
      <div
        className="flex-col h-0 flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
        }}
      >
        <div className="flex flex-center flex-1 h-0 p-8 text-white mb:p-0">
          {!state.selectedGroup && (
            <div className="relative flex-col items-stretch gap-y-7 bg-black/80 rounded-[10px] p-7 mb:px-0 max-h-full mb:w-full">
              <div className="text-18 text-center my-3">
                登录 Port 论坛
              </div>
              <Scrollable hideTrackOnMobile light>
                <div className="flex flex-wrap justify-center gap-6 pc:w-[720px] px-4">
                  {state.groups.map(({ group, config, loginState }) => {
                    const loginButton = [
                      loginState?.lastLogin === 'mixin' && config.mixin && !!loginState?.mixin && 'saved-mixin',
                      loginState?.lastLogin === 'keystore' && config.keystore && !!loginState?.keystore && 'saved-keystore',
                      loginState?.lastLogin === 'metamask' && config.metamask && !!loginState?.metamask && 'saved-metamask',
                      config.mixin && !loginState?.mixin && 'mixin',
                      config.keystore && !loginState?.keystore && 'keystore',
                      config.metamask && !loginState?.metamask && 'metamask',
                    ].find((v) => v);
                    return (
                      <div
                        className="flex-col items-stretch relative border border-gray-4a w-[320px] mb:w-full p-4 rounded-md"
                        key={group.id}
                      >
                        <GroupAvatar
                          groupId={group.id}
                          square
                          groupName={quorumUtils.restoreSeedFromUrl(group.mainSeedUrl).group_name}
                          size={44}
                          fontSize={20}
                        />
                        {config.anonymous && (!!config.mixin || !!config.keystore || !!config.metamask) && (
                          <Button
                            className="flex flex-center absolute text-14 right-1 py-1 top-1 text-gray-9c"
                            variant="text"
                            onClick={() => handleLoginAnonymous(group)}
                          >
                            随便看看
                            <ChevronRight className="text-26 -mt-px -mr-2" />
                          </Button>
                        )}
                        <div className="flex-col flex-1 justify-start items-stretch px-2 gap-y-2">
                          <div className="flex flex-center text-center truncate -mt-4 mb-2">
                            {quorumUtils.restoreSeedFromUrl(group.mainSeedUrl).group_name}
                          </div>
                          <div className="text-12 text-gray-9c truncate-2 -mt-2 mb-1">
                            {renderDesc(nodeService.state.appConfigMap[group.id]?.[APPCONFIG_KEY_NAME.DESC]?.Value)}
                          </div>
                          <div className="flex-1" />
                          {loginButton === 'saved-mixin' && (
                            <Tooltip title="用上次使用的 Mixin 登录" placement="right">
                              <Button
                                className="text-link-soft text-14 w-full py-[3px] normal-case"
                                size="small"
                                color="link-soft"
                                variant="outlined"
                                onClick={() => handleLoginByMixin(group, loginState!.mixin!.mixinJWT)}
                              >
                                <span className="truncate">
                                  上次的 Mixin 账号登录: {loginState!.mixin!.userName}
                                </span>
                              </Button>
                            </Tooltip>
                          )}
                          {loginButton === 'saved-keystore' && (
                            <Tooltip title="用上次使用的 Keystore 账号登录" placement="right">
                              <Button
                                className="text-link-soft text-14 w-full py-[3px] normal-case"
                                size="small"
                                color="link-soft"
                                variant="outlined"
                                onClick={() => handleLoginBySavedKeystore(group, loginState!.keystore!)}
                              >
                                <span className="truncate">
                                  上次使用的 keystore: {loginState!.keystore!.address.slice(0, 10)}
                                </span>
                              </Button>
                            </Tooltip>
                          )}
                          {loginButton === 'saved-metamask' && (
                            <Tooltip title="用上次使用的 MetaMask 账号登录" placement="right">
                              <Button
                                className="text-link-soft text-14 w-full py-[3px] normal-case truncate"
                                size="small"
                                color="link-soft"
                                variant="outlined"
                                onClick={() => handleLoginBySavedMetaMask(group, loginState!.metamask!.mixinJWT)}
                              >
                                <span className="truncate">
                                  上次的 MetaMask 账号: {loginState!.metamask!.address.slice(0, 10).toLowerCase()}
                                </span>
                              </Button>
                            </Tooltip>
                          )}
                          {loginButton === 'mixin' && (
                            <Tooltip title="使用 Mixin 账号登录" placement="right">
                              <Button
                                className="text-rum-orange text-14 w-full py-[3px] normal-case"
                                size="small"
                                color="rum"
                                variant="outlined"
                                onClick={() => handleOpenMixinLogin(group)}
                              >
                                <span className="truncate">
                                  使用 Mixin 扫码登录
                                </span>
                              </Button>
                            </Tooltip>
                          )}
                          {loginButton === 'keystore' && (
                            <Tooltip title="输入 Keystore 和 密码" placement="right" disableInteractive>
                              <Button
                                className="text-rum-orange text-14 w-full py-[3px] normal-case"
                                size="small"
                                color="rum"
                                variant="outlined"
                                onClick={() => handleShowKeystoreDialog(group)}
                              >
                                <span className="truncate">
                                  输入 Keystore
                                </span>
                              </Button>
                            </Tooltip>
                          )}
                          {loginButton === 'metamask' && (
                            <Tooltip title="输入 Keystore 和 密码" placement="right" disableInteractive>
                              <Button
                                className="text-rum-orange text-14 w-full py-[3px] normal-case"
                                size="small"
                                color="rum"
                                variant="outlined"
                                onClick={() => handleLoginByNewMetaMask(group)}
                              >
                                <span className="truncate">
                                  MetaMask 登录
                                </span>
                              </Button>
                            </Tooltip>
                          )}
                          {(!!config.mixin || !!config.keystore || !!config.metamask) && (
                            <Button
                              className="text-gray-9c text-14 w-full py-[3px] normal-case"
                              size="small"
                              color="inherit"
                              variant="text"
                              onClick={() => handleOpenGroup(group)}
                            >
                              <span className="truncate">
                                更多登录方式
                              </span>
                            </Button>
                          )}
                          {(!config.mixin && !config.keystore && !config.metamask) && (
                            <Button
                              className="text-gray-9c text-14 w-full py-[3px] normal-case"
                              size="small"
                              color="inherit"
                              variant="text"
                              onClick={() => handleLoginAnonymous(group)}
                            >
                              游客模式
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Scrollable>
            </div>
          )}

          {!!state.selectedGroup && (
            <div className="relative flex-col items-stretch gap-y-7 bg-black/80 pc:w-[720px] mb:w-full rounded-[10px] p-7">
              <Button
                className="flex flex-center absolute left-2 top-2 text-14 font-normal text-gray-9c"
                variant="text"
                color="inherit"
                onClick={action(() => { state.selectedGroup = null; })}
              >
                <ChevronLeft className="text-24 -mt-px" />
                返回
              </Button>

              <GroupAvatar
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3"
                groupId={state.selectedGroup.id}
                groupName={quorumUtils.restoreSeedFromUrl(state.selectedGroup.mainSeedUrl).group_name}
                size={100}
              />
              <div className="mt-12 text-gray-f2 text-18 truncate text-center">
                {quorumUtils.restoreSeedFromUrl(state.selectedGroup.mainSeedUrl).group_name}
              </div>

              <div className="hidden mt-2 text-gray-f2 text-14 truncate-3 max-w-[400px] self-center">
                {renderDesc(nodeService.state.appConfigMap[state.selectedGroup.id]?.[APPCONFIG_KEY_NAME.DESC]?.Value)}
              </div>

              <div className="flex-col self-center items-stertch mt-4 gap-y-4 min-w-[200px] mb:w-full">
                {!!state.selectedGroupConfig?.keystore && !!state.selectedGroupLoginState?.keystore && (
                  <div className="relative flex items-center gap-x-2">
                    <Tooltip title="用上次使用的 Keystore 登录" placement="right" disableInteractive>
                      <Button
                        className="text-link-soft rounded-full text-16 px-8 py-2 normal-case flex-1 max-w-[350px]"
                        color="link-soft"
                        variant="outlined"
                        // disbled={keystoreloading}
                        onClick={() => handleLoginBySavedKeystore(state.selectedGroup!, state.selectedGroupLoginState!.keystore!)}
                      >
                        <span className="truncate">
                          上次使用的 keystore{' '}
                          ({state.selectedGroupLoginState.keystore.address.slice(0, 10)})
                        </span>
                        {/* {keystore.loading && (
                          <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                        )} */}
                      </Button>
                    </Tooltip>
                    <Tooltip title="清除保存的 Keystore" placement="right" disableInteractive>
                      <IconButton
                        className="absolute right-0 mb:static mb:mr-0 mb:translate-x-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                        color="inherit"
                        onClick={() => handleClearSavedLogin(state.selectedGroup!, 'keystore')}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}

                {!!state.selectedGroupConfig?.mixin && !!state.selectedGroupLoginState?.mixin && (
                  <div className="relative flex items-center gap-x-2">
                    <Tooltip title="用上次使用的 Mixin 账号登录" placement="right" disableInteractive>
                      <Button
                        className="text-link-soft rounded-full text-16 px-8 py-2 normal-case flex-1 max-w-[350px]"
                        color="link-soft"
                        variant="outlined"
                        // disabled={mixin.loading}
                        onClick={() => handleLoginByMixin(state.selectedGroup!, state.selectedGroupLoginState!.mixin!.mixinJWT)}
                      >
                        <span className="truncate">
                          上次的 mixin 账号{' '}
                          ({state.selectedGroupLoginState.mixin.userName})
                        </span>
                        {/* {mixin.loading && (
                          <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                        )} */}
                      </Button>
                    </Tooltip>
                    <Tooltip title="清除保存的 Mixin 账号" placement="right" disableInteractive>
                      <IconButton
                        className="absolute right-0 mb:static mb:mr-0 mb:translate-x-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                        color="inherit"
                        onClick={() => handleClearSavedLogin(state.selectedGroup!, 'mixin')}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}

                {!!state.selectedGroupConfig?.metamask && !!state.selectedGroupLoginState?.metamask && (
                  <div className="relative flex items-center gap-x-2">
                    <Tooltip title="用上次使用的 MetaMask 登录" placement="right" disableInteractive>
                      <Button
                        className="text-link-soft rounded-full text-16 px-8 py-2 normal-case flex-1 max-w-[350px]"
                        color="link-soft"
                        variant="outlined"
                        // disabled={mixin.loading}
                        onClick={() => handleLoginBySavedMetaMask(state.selectedGroup!, state.selectedGroupLoginState!.metamask!.mixinJWT)}
                      >
                        <span className="truncate">
                          上次的 MetaMask 账号{' '}
                          ({state.selectedGroupLoginState.metamask.address.slice(0, 10).toLowerCase()})
                        </span>
                        {/* {mixin.loading && (
                          <CircularProgress className="ml-2 flex-none text-white/70" size={16} thickness={5} />
                        )} */}
                      </Button>
                    </Tooltip>
                    <Tooltip title="清除保存的 MetaMask 账号" placement="right" disableInteractive>
                      <IconButton
                        className="absolute right-0 mb:static mb:mr-0 mb:translate-x-0 translate-x-full -mr-2 text-white/70 hover:text-red-400"
                        color="inherit"
                        onClick={() => handleClearSavedLogin(state.selectedGroup!, 'metamask')}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}

                {!!state.selectedGroupConfig?.mixin && (
                  <Tooltip title="使用 Mixin 账号登录" placement="right" disableInteractive>
                    <Button
                      className="text-rum-orange rounded-full text-16 px-8 py-2 normal-case"
                      color="rum"
                      variant="outlined"
                      onClick={() => handleOpenMixinLogin(state.selectedGroup!)}
                    >
                      使用 Mixin 扫码登录
                    </Button>
                  </Tooltip>
                )}
                {!!state.selectedGroupConfig?.metamask && (
                  <Tooltip title="使用 MetaMask 登录" placement="right" disableInteractive>
                    <Button
                      className="text-rum-orange rounded-full text-16 px-8 py-2 normal-case"
                      color="rum"
                      variant="outlined"
                      onClick={() => handleLoginByNewMetaMask(state.selectedGroup!)}
                    >
                      MetaMask 登录
                    </Button>
                  </Tooltip>
                )}
                {!!state.selectedGroupConfig?.keystore && (
                  <Tooltip title="创建一个随机账号" placement="right" disableInteractive>
                    <Button
                      className="text-rum-orange rounded-full text-16 px-8 py-2"
                      color="rum"
                      variant="outlined"
                      onClick={() => handleLoginByRandom(state.selectedGroup!)}
                    >
                      随机账号登录
                    </Button>
                  </Tooltip>
                )}
                {!!state.selectedGroupConfig?.keystore && (
                  <Tooltip title="输入 Keystore 和 密码" placement="right" disableInteractive>
                    <Button
                      className="text-rum-orange rounded-full text-16 px-8 py-2 normal-case"
                      color="rum"
                      variant="outlined"
                      onClick={() => handleShowKeystoreDialog(state.selectedGroup!)}
                    >
                      输入 Keystore
                    </Button>
                  </Tooltip>
                )}
                {!!state.selectedGroupConfig?.anonymous && (
                  <Button
                    className="text-link-soft text-14 px-2 py-1 normal-case"
                    size="small"
                    color="inherit"
                    variant="text"
                    onClick={() => handleLoginAnonymous(state.selectedGroup!)}
                  >
                    随便看看(游客模式)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <ThemeLight>
        <Dialog
          open={state.keystoreDialog.open}
          onClose={action(() => { if (!state.keystoreDialog.loading) { state.keystoreDialog.open = false; } })}
        >
          <div className="flex-col relative text-black w-[400px]">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { if (!state.keystoreDialog.loading) { state.keystoreDialog.open = false; } })}
              disabled={state.keystoreDialog.loading}
            >
              <Close />
            </IconButton>
            <div className="flex-col flex-1 justify-between items-center p-6 gap-y-6">
              <div className="text-18">
                注册/登录 ({state.keystoreDialog.group ? quorumUtils.restoreSeedFromUrl(state.keystoreDialog.group.mainSeedUrl).group_name : ''})
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
                    value={state.keystoreDialog.keystore}
                    onChange={action((e) => { state.keystoreDialog.keystore = e.target.value; })}
                    disabled={state.keystoreDialog.loading}
                  />
                </FormControl>
                <FormControl size="small">
                  <InputLabel>密码</InputLabel>
                  <OutlinedInput
                    size="small"
                    label="密码"
                    type={state.keystoreDialog.passwordVisibility ? 'text' : 'password'}
                    value={state.keystoreDialog.password}
                    onChange={action((e) => { state.keystoreDialog.password = e.target.value; })}
                    disabled={state.keystoreDialog.loading}
                    endAdornment={(
                      <IconButton
                        className="-mr-2"
                        size="small"
                        onClick={action(() => { state.keystoreDialog.passwordVisibility = !state.keystoreDialog.passwordVisibility; })}
                      >
                        {state.keystoreDialog.passwordVisibility && (<Visibility className="text-20" />)}
                        {!state.keystoreDialog.passwordVisibility && (<VisibilityOff className="text-20" />)}
                      </IconButton>
                    )}
                  />
                </FormControl>
                <FormControlLabel
                  className="flex-center"
                  label="记住 keystore 和 密码"
                  control={(
                    <Checkbox
                      checked={state.keystoreDialog.remember}
                      onChange={action((_, v) => { state.keystoreDialog.remember = v; })}
                      disabled={state.keystoreDialog.loading}
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
                  loading={state.keystoreDialog.createWalletLoading}
                  disabled={state.keystoreDialog.loading}
                >
                  创建新钱包
                </LoadingButton>
                <LoadingButton
                  className="rounded-full text-16 px-10 py-2"
                  color="link"
                  variant="outlined"
                  onClick={handleLoginByKeystoreDialog}
                  disabled={!state.keystoreDialog.valid}
                  loading={state.keystoreDialog.loading}
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
          open={state.mixinLogin.dialogOpen}
          onClose={action(() => { state.mixinLogin.dialogOpen = false; })}
        >
          <div className="flex-col relative text-black h-full">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { state.mixinLogin.dialogOpen = false; })}
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
                  src={`https://vault.rumsystem.net/v1/oauth/mixin/login?state=${state.mixinLogin.keyInHex}&return_to=${encodeURIComponent(`${window.location.origin}/mixin-login.html`)}`}
                />
              </div>
            </div>
          </div>
        </Dialog>
      </ThemeLight>
    </div>
  );
});
