import React, { useRef, useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { parse } from 'query-string';
import { toUint8Array } from 'js-base64';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk';
import { either, taskEither, function as fp, task } from 'fp-ts';
import type { GroupInfo, Profile } from 'nft-bbs-server';
import { nftbbsAppKeyName } from 'nft-bbs-types';
import {
  Button, Checkbox, CircularProgress, Dialog, FormControl,
  FormControlLabel, IconButton, InputLabel, Menu, MenuItem, OutlinedInput, Tooltip,
} from '@mui/material';
import { Check, ChevronLeft, Close, Delete, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import PasteIcon from 'boxicons/svg/regular/bx-paste.svg?fill-icon';

import bgImg1x from '~/assets/images/rum_barrel_bg.jpg';
import bgImg2x from '~/assets/images/rum_barrel_bg@2x.jpg';
import bgImg3x from '~/assets/images/rum_barrel_bg@3x.jpg';
import rumsystemLogo from '~/assets/icons/rumsystem.svg';
import RumLogo from '~/assets/icons/logo.png';
import RumLogo2x from '~/assets/icons/logo@2x.png';
import RumLogo3x from '~/assets/icons/logo@3x.png';
import LanguageIcon from '~/assets/icons/language-select.svg?fill-icon';

import { chooseImgByPixelRatio, getLoginState, runLoading, setLoginState, ThemeLight } from '~/utils';
import {
  AllLanguages, configService, dialogService, keyService, langName,
  langService, nodeService, snackbarService,
} from '~/service';
import { GroupAvatar, Scrollable } from '~/components';
import { GroupInfoApi, VaultApi } from '~/apis';
import { useNavigate } from 'react-router-dom';

enum Step {
  InputSeedUrl = 1,
  SeedUrlParsingError = 2,
  PrepareJoinGroup = 3,
}

export const Join = observer(() => {
  const state = useLocalObservable(() => ({
    seedUrl: '',
    keystorePopup: false,
    mixinLogin: false,
    keystore: '',
    password: '',
    passwordVisibility: false,
    rememberPassword: false,
    step: Step.InputSeedUrl,
    languageMenu: false,
    createWalletLoading: false,
    seed: null as null | ReturnType<typeof QuorumLightNodeSDK.utils.restoreSeedFromUrl>,
    groupInfo: null as null | GroupInfo,
    crpytoKey: null as CryptoKey | null,
    keyInHex: '',

    savedLoginState: {
      mixinCanLogin: false as false | { jwt: string, appUser: VaultApi.VaultAppUser, user: VaultApi.VaultUser },
      keystoreCanLogin: false as false | {
        keystore: string
        password: string
        profile: Profile
      },
    },
    get computedSeedUrl() {
      return configService.state.seedUrl || state.seedUrl;
    },
    get canLogin() {
      return !!this.password && !!this.keystore;
    },
  }));
  const navigate = useNavigate();

  const languageButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleChangeLanguage = action((lang: AllLanguages) => {
    langService.switchLang(lang);
    state.languageMenu = false;
  });

  const handleNextStep = () => {
    if (state.step === Step.InputSeedUrl) {
      try {
        const seed = QuorumLightNodeSDK.utils.restoreSeedFromUrl(state.computedSeedUrl);
        if (seed.app_key !== nftbbsAppKeyName) {
          dialogService.open({
            title: '种子网络类型不支持',
            content: '加入的种子网络类型不是当前支持的类型。',
            cancel: null,
          });
          return;
        }
        GroupInfoApi.get(seed.group_id).then(action((v) => {
          state.groupInfo = v;
        }));
        configService.loadConfig();
        runInAction(() => {
          state.seed = seed;
          state.step = Step.PrepareJoinGroup;
        });
      } catch (e) {
        snackbarService.error(`解析失败 (${(e as Error).message})`);
        runInAction(() => {
          state.step = Step.SeedUrlParsingError;
        });
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      runInAction(() => {
        state.seedUrl = text;
      });
    } catch (e) {
      snackbarService.show('读取剪切板失败');
    }
  };

  const joinGroup = () => {
    try {
      nodeService.group.join(state.computedSeedUrl);
      setLoginState({ seedUrl: state.computedSeedUrl });
      runInAction(() => {
        nodeService.state.showJoin = false;
        nodeService.state.showMain = true;
      });
      navigate(`/${nodeService.state.groupId}`);
      return true;
    } catch (e: any) {
      snackbarService.error(e.message);
      return false;
    }
  };

  const handleLoginByRandom = async () => {
    const loginedKeystore = await keyService.loginRandom('123');
    setLoginState({
      autoLogin: 'keystore',
      keystore: loginedKeystore.keystore,
      password: '123',
      seedUrl: state.computedSeedUrl,
    });
    joinGroup();
  };

  const handleLoginBySaved = async (type: 'keystore' | 'mixin') => {
    if (type === 'mixin' && state.savedLoginState.mixinCanLogin) {
      const result = await VaultApi.getOrCreateAppUser(state.savedLoginState.mixinCanLogin.jwt);
      if (either.isLeft(result)) {
        snackbarService.error('登录失败');
        return;
      }
      const { jwt, user, appUser } = result.right;
      keyService.mixinLogin(jwt, user, appUser);
      setLoginState({ autoLogin: 'mixin' });
      joinGroup();
    }

    if (type === 'keystore' && state.savedLoginState.keystoreCanLogin) {
      const { keystore, password } = state.savedLoginState.keystoreCanLogin;
      const loginResult = await keyService.login(keystore, password);
      if (either.isLeft(loginResult)) {
        snackbarService.error('登录失败');
        return;
      }
      setLoginState({ autoLogin: 'keystore' });
      joinGroup();
    }
  };

  const handleClearSavedLogin = async (type: 'keystore' | 'mixin') => {
    const confirm = await dialogService.open({
      title: '清除保存的登录',
      content: '确实要清除保存的登录状态吗',
    });
    if (confirm === 'cancel') { return; }
    if (type === 'mixin') {
      runInAction(() => {
        state.savedLoginState.mixinCanLogin = false;
      });
      setLoginState({
        mixinJWT: '',
      });
    }

    if (type === 'keystore') {
      runInAction(() => {
        state.savedLoginState.keystoreCanLogin = false;
      });
      setLoginState({
        keystore: '',
        password: '',
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
      state.mixinLogin = true;
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
    const { jwt, user, appUser } = userResult;
    setLoginState({
      autoLogin: 'mixin',
      mixinJWT: jwt,
      seedUrl: state.computedSeedUrl,
    });
    keyService.mixinLogin(jwt, user, appUser);
    joinGroup();
  };

  const handleShowKeystoreDialog = action(() => {
    const loginState = getLoginState();
    state.keystorePopup = true;
    state.keystore = loginState.keystore;
    state.password = loginState.password;
    state.rememberPassword = state.canLogin;
  });

  const handleLoginConfirm = async () => {
    const result = await keyService.login(state.keystore, state.password);
    if (either.isLeft(result)) {
      snackbarService.error('keystore或密码错误');
      return;
    }
    setLoginState({
      autoLogin: state.rememberPassword ? 'keystore' : null,
      keystore: state.keystore,
      seedUrl: state.computedSeedUrl,
      password: state.rememberPassword ? state.password : '',
    });
    joinGroup();
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

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) { return; }
    const content = await file.text();
    runInAction(() => {
      state.seedUrl = content;
    });
  };

  const validateLoginState = async () => {
    const loginState = getLoginState();
    runInAction(() => {
      state.seedUrl = loginState.seedUrl;
      handleNextStep();
    });
    if (loginState.jumpToLogin && state.seedUrl) {
      setLoginState({ jumpToLogin: false });
    }

    if (loginState && loginState.mixinJWT) {
      const result = await VaultApi.getOrCreateAppUser(loginState.mixinJWT);
      if (either.isRight(result)) {
        runInAction(() => {
          state.savedLoginState.mixinCanLogin = result.right;
        });
      }
    }

    if (loginState && loginState.keystore && loginState.password) {
      const loginResult = await keyService.validate(loginState.keystore, loginState.password);
      if (either.isRight(loginResult)) {
        runInAction(() => {
          state.savedLoginState.keystoreCanLogin = {
            keystore: loginState.keystore,
            password: loginState.password,
            profile: nodeService.profile.getFallbackProfile({
              userAddress: loginResult.right.address,
            }),
          };
        });
      }
    }
  };

  useEffect(() => {
    validateLoginState();
    nodeService.group.loadGroups();
    const handleMessage = (e: MessageEvent<{ name: string, search: string }>) => {
      const data = e.data;
      if (typeof data !== 'object') { return; }
      if (data.name !== 'mixin-login-message') { return; }
      handleMixinLoginCallback(data.search);
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.addEventListener('message', handleMessage);
    };
  }, []);

  return (<>
    <div className="min-h-[100vh] flex-col">
      <input
        type="file"
        hidden
        accept=".json,.txt"
        onChange={handleSelectFile}
        ref={fileInput}
      />
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
      <div className="fixed top-12 right-16 flex items-center flex-none">
        {false && (
          <Button
            className="text-[#5fc0e9] px-4"
            variant="text"
            ref={languageButton}
            onClick={action(() => { state.languageMenu = true; })}
          >
            <LanguageIcon className="mr-3 text-cyan-blue text-20" />
            <span className="normal-case text-14">
              Language
            </span>
          </Button>
        )}

        {false && (
          <ThemeLight>
            <Menu
              className="mt-1"
              open={state.languageMenu}
              anchorEl={languageButton.current}
              onClose={action(() => { state.languageMenu = false; })}
              anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'center', vertical: 'top' }}
              disableScrollLock
            >
              <MenuItem onClick={() => handleChangeLanguage('en')}>
                <div className="flex flex-center w-5 mr-2">
                  {langService.state.lang === 'en' && (
                    <Check className="text-20 text-soft-blue" />
                  )}
                </div>
                {langName.en}
              </MenuItem>
              <MenuItem onClick={() => handleChangeLanguage('zh-cn')}>
                <div className="flex flex-center w-5 mr-2">
                  {langService.state.lang === 'zh-cn' && (
                    <Check className="text-20 text-soft-blue" />
                  )}
                </div>
                {langName['zh-cn']}
              </MenuItem>
            </Menu>
          </ThemeLight>
        )}
      </div>
      <div
        className="flex-col flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
        }}
      >
        <div className="flex flex-center flex-1">
          <div className="relative flex-col flex-center bg-black/80 w-[720px] rounded-[10px]">
            {state.step === Step.InputSeedUrl && (
              <div className="flex-col flex-center min-h-[330px] py-12">
                <div className="text-white text-18">
                  加入 Port 种子网络
                </div>
                {!!nodeService.state.groups.length && !configService.state.seedUrl && (
                  <div className="flex-col items-center mt-8 -mb-4 text-white gap-y-4">
                    <div className="text-white/80">可加入的种子网络</div>
                    <Scrollable className="max-h-[200px]" light size="large">
                      <div className="flex flex-wrap justify-center gap-4 px-4">
                        {/* {Array(20).fill(state.groups).flatMap((v) => v).map((v, i) => ( */}
                        {nodeService.state.groups.map((v) => (
                          <button
                            className="bg-white/20 hover:bg-white/30 rounded-full px-4 py-2"
                            key={v.groupId}
                            onClick={action(() => {
                              state.seedUrl = v.seedUrl;
                              handleNextStep();
                            })}
                          >
                            {v.groupName}
                          </button>
                        ))}
                      </div>
                    </Scrollable>
                  </div>
                )}
                {!configService.state.seedUrl && (
                  <OutlinedInput
                    className="text-white w-[440px] mt-12 pl-2"
                    value={state.seedUrl}
                    onChange={action((e) => { state.seedUrl = e.target.value; })}
                    endAdornment={(
                      <Button
                        className="flex flex-none text-white ml-2"
                        variant="text"
                        color="inherit"
                        onClick={handlePaste}
                      >
                        <PasteIcon className="text-20 mr-1" />
                        粘贴
                      </Button>
                    )}
                    placeholder="输入种子文本 Rum://"
                  />
                )}
                {!!configService.state.seedUrl && (
                  <OutlinedInput
                    className="text-white w-[440px] mt-12 pl-2"
                    value={configService.state.seedUrl}
                    disabled
                    placeholder="输入种子文本 Rum://"
                  />
                )}

                <div className="flex gap-x-4 mt-12">
                  {/* <Button
                    className="text-16 px-4"
                    color="rum"
                    variant="text"
                    onClick={() => fileInput.current?.click()}
                  >
                    或导入本地种子文件
                  </Button> */}

                  <Button
                    className="text-16 rounded-full px-7"
                    color="rum"
                    variant="outlined"
                    onClick={handleNextStep}
                  >
                    加入
                  </Button>
                </div>
              </div>
            )}
            {false && (
              <div className="flex-col flex-center">
                <CircularProgress className="text-gray-70" size={48} />

                <div className="mt-12 text-white text-16">
                  rum://ablacadablablablablabla…
                </div>
                <div className="mt-12">
                  <Button
                    className="text-16 px-4"
                    color="rum"
                    variant="text"
                    onClick={action(() => { state.step += 1; })}
                  >
                    重新导入本地种子文件
                  </Button>
                </div>
              </div>
            )}
            {state.step === Step.SeedUrlParsingError && (
              <div className="flex-col flex-center h-[330px] ">
                <div className="text-white">
                  种子文本解析错误
                </div>
                <div className="mt-12 text-white text-16 truncate-2 break-all px-12">
                  {state.seedUrl}
                </div>
                <div className="text-[#f87171] text-16 mt-8">
                  种子文本有误，您可以：
                </div>
                <div className="text-16 mt-2">
                  <Button
                    className="text-16 px-3"
                    color="rum"
                    variant="text"
                    size="small"
                    onClick={action(() => { state.step = Step.InputSeedUrl; })}
                  >
                    重新输入种子文本
                  </Button>
                  {/* <span className="text-gray-9c">
                    {' '}或{' '}
                  </span>
                  <Button
                    className="text-16 px-3"
                    color="rum"
                    variant="text"
                    size="small"
                    onClick={action(() => { state.step += 1; })}
                  >
                    重新导入本地种子文件
                  </Button> */}
                </div>
              </div>
            )}
            {state.step === Step.PrepareJoinGroup && (
              <div className="flex-col items-center py-12">
                <Button
                  className="flex flex-center absolute left-2 top-2 text-14 font-normal text-gray-9c"
                  variant="text"
                  color="inherit"
                  onClick={action(() => { state.step = Step.InputSeedUrl; })}
                >
                  <ChevronLeft className="text-24 -mt-px" />
                  返回重新输入种子
                </Button>
                <GroupAvatar
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3"
                  groupName={state.seed?.group_name ?? ''}
                  avatar={state.groupInfo?.avatar}
                  size={100}
                />
                <div className="mt-12 text-gray-f2 text-18 truncate max-w-[400px]">
                  {state.seed?.group_name}
                </div>

                <div className="mt-2 text-gray-f2 text-14 truncate-3 max-w-[400px]">
                  {state.groupInfo?.desc}
                </div>

                <div className="flex-col items-stertch mt-4 gap-y-4 min-w-[200px]">
                  {!!state.savedLoginState.keystoreCanLogin && configService.state.keystoreLogin && (
                    <div className="relative flex items-center gap-x-2">
                      <Tooltip title="用上次登录使用的keystore登录" placement="right">
                        <Button
                          className="text-link-soft rounded-full text-14 px-8 py-2 normal-case flex-1 max-w-[350px]"
                          color="inherit"
                          variant="outlined"
                          onClick={() => handleLoginBySaved('keystore')}
                        >
                          <span className="truncate">
                            上次使用的 keystore 登录{' '}
                            ({state.savedLoginState.keystoreCanLogin.profile.name
                          || state.savedLoginState.keystoreCanLogin.profile.userAddress.slice(0, 10)})
                          </span>
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

                  {!!state.savedLoginState.mixinCanLogin && configService.state.mixinLogin && (
                    <div className="relative flex items-center gap-x-2">
                      <Tooltip title="用上次登录使用的 mixin账号登录" placement="right">
                        <Button
                          className="text-link-soft rounded-full text-14 px-8 py-2 normal-case flex-1 max-w-[350px]"
                          color="inherit"
                          variant="outlined"
                          onClick={() => handleLoginBySaved('mixin')}
                        >
                          <span className="truncate">
                            上次使用的 mixin 账号登录 ({state.savedLoginState.mixinCanLogin.user.display_name})
                          </span>
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
                  {configService.state.mixinLogin && (
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
                  {configService.state.keystoreLogin && (
                    <Tooltip title="用保存的账号登录 或 创建一个随机账号" placement="right">
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
                  {configService.state.keystoreLogin && (
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
                  {configService.state.anonymousLogin && (
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
        onClose={action(() => { state.keystorePopup = false; })}
      >
        {true && (
          <div className="flex-col relative text-black w-[400px]">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { state.keystorePopup = false; })}
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
                >
                  创建新钱包
                </LoadingButton>
                <Button
                  className="rounded-full text-16 px-10 py-2"
                  color="link"
                  variant="outlined"
                  onClick={handleLoginConfirm}
                  disabled={!state.canLogin}
                >
                  确定
                </Button>
              </div>
            </div>
          </div>
        )}
        {false && (
          <div className="flex-col relative w-[400px] h-[350px]">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { state.keystorePopup = false; })}
            >
              <Close />
            </IconButton>
            <div className="flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-4">
              <div className="text-16 font-medium">
                编辑身份资料
              </div>
              <div className="w-20 h-20 bg-black/20" />
              <FormControl size="small">
                <InputLabel>昵称</InputLabel>
                <OutlinedInput
                  label="昵称"
                  size="small"
                />
              </FormControl>
              <button className="text-gray-9c rounded-full text-14">
                暂时跳过
              </button>
              <Button
                className="rounded-full text-16 px-10 py-2"
                color="link"
                variant="outlined"
              >
                确定
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={state.mixinLogin}
        onClose={action(() => { state.mixinLogin = false; })}
      >
        {true && (
          <div className="flex-col relative text-black">
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
              <div className="flex-col gap-y-4 items-stretch">
                <iframe
                  className="w-[400px] h-[650px]"
                  src={`https://vault.rumsystem.net/v1/oauth/mixin/login?state=${state.keyInHex}&return_to=${encodeURIComponent(`${window.location.origin}/mixin-login.html`)}`}
                  // src="https://vault.rumsystem.net/v1/user"
                />
              </div>
              {/* <div className="flex gap-x-4">
                <Button
                  className="rounded-full text-16 px-10 py-2"
                  color="link"
                  variant="outlined"
                  onClick={action(() => { state.mixinLogin = false; })}
                >
                  取消
                </Button>
              </div> */}
            </div>
          </div>
        )}
        {false && (
          <div className="flex-col relative w-[400px] h-[350px]">
            <IconButton
              className="absolute top-2 right-2"
              onClick={action(() => { state.keystorePopup = false; })}
            >
              <Close />
            </IconButton>
            <div className="flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-4">
              <div className="text-16 font-medium">
                编辑身份资料
              </div>
              <div className="w-20 h-20 bg-black/20" />
              <FormControl size="small">
                <InputLabel>昵称</InputLabel>
                <OutlinedInput
                  label="昵称"
                  size="small"
                />
              </FormControl>
              <button className="text-gray-9c rounded-full text-14">
                暂时跳过
              </button>
              <Button
                className="rounded-full text-16 px-10 py-2"
                color="link"
                variant="outlined"
              >
                确定
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </ThemeLight>
  </>);
});
