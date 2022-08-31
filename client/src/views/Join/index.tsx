
import React, { useEffect, useRef } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import store from 'store2';
import QuorumLightNodeSDK, { IGroup } from 'quorum-light-node-sdk';
import {
  Button, Checkbox, CircularProgress, Dialog, FormControl,
  FormControlLabel, IconButton, InputLabel, OutlinedInput,
} from '@mui/material';
import { ChevronLeft, Close, Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import PasteIcon from 'boxicons/svg/regular/bx-paste.svg?fill-icon';

import bgImg1x from '~/assets/images/rum_barrel_bg.jpg';
import bgImg2x from '~/assets/images/rum_barrel_bg@2x.jpg';
import bgImg3x from '~/assets/images/rum_barrel_bg@3x.jpg';
import logoImg from '~/assets/icons/rumsystem.svg';
import RumLogo from '~/assets/icons/logo.png';
import RumLogo2x from '~/assets/icons/logo@2x.png';
import RumLogo3x from '~/assets/icons/logo@3x.png';
// import LanguageIcon from '~/assets/icons/language-select.svg?fill-icon';

import { chooseImgByPixelRatio, runLoading, ThemeLight } from '~/utils';
import { keyService, nodeService, snackbarService } from '~/service';
import { GroupAvatar } from '~/components';

enum Step {
  SavedLoginCheck = 0,
  InputSeedUrl = 1,
  SeedUrlParsingError = 2,
  PrepareJoinGroup = 3,
}

export const Join = observer(() => {
  const state = useLocalObservable(() => ({
    // seedUrl: store('seedUrl') || 'rum://seed?v=1&e=0&n=0&b=4q6xzwoZSN2N_8wNgt4qfQ&c=b5XdM7mnLlFx43jASvVQ2GvtFx0mCr09UYlH6273SGA&g=9_zl1xKSRwOcKnKe74Fb7Q&k=Ag_AMFZFuhsAkUGaEJ9om2nDGVmcRDci74j4DqcWXnuW&s=hE-Q-a6nB1CcpW6mnOIDhN7G5yFZ450vpFMMAZKUEtx086PiSqzoLsusT79pm1d9k7khxwK8fDk1DOyGKMFZ6gE&t=FwrY-W_8ye0&a=NFT%E8%AE%BA%E5%9D%9B%E4%BA%A7%E5%93%81%E5%86%85%E6%B5%8B%E4%B8%93%E7%94%A82&y=group_timeline&u=https%3A%2F%2F103.61.39.95%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyJmN2ZjZTVkNy0xMjkyLTQ3MDMtOWMyYS03MjllZWY4MTViZWQiXSwiZXhwIjoxODE4MDU3OTgzLCJuYW1lIjoiYWxsb3ctZjdmY2U1ZDctMTI5Mi00NzAzLTljMmEtNzI5ZWVmODE1YmVkIiwicm9sZSI6Im5vZGUifQ.Hq0pS_h6gOSizdErZuYyTzYkyFj1458jSiZ3wJn_tNY',
    // seedUrl: 'rum://seed?v=1&e=0&n=0&b=4q6xzwoZSN2N_8wNgt4qfQ&c=b5XdM7mnLlFx43jASvVQ2GvtFx0mCr09UYlH6273SGA&g=9_zl1xKSRwOcKnKe74Fb7Q&k=Ag_AMFZFuhsAkUGaEJ9om2nDGVmcRDci74j4DqcWXnuW&s=hE-Q-a6nB1CcpW6mnOIDhN7G5yFZ450vpFMMAZKUEtx086PiSqzoLsusT79pm1d9k7khxwK8fDk1DOyGKMFZ6gE&t=FwrY-W_8ye0&a=NFT%E8%AE%BA%E5%9D%9B%E4%BA%A7%E5%93%81%E5%86%85%E6%B5%8B%E4%B8%93%E7%94%A82&y=group_timeline&u=https%3A%2F%2F103.61.39.95%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyJmN2ZjZTVkNy0xMjkyLTQ3MDMtOWMyYS03MjllZWY4MTViZWQiXSwiZXhwIjoxODE4MDU3OTgzLCJuYW1lIjoiYWxsb3ctZjdmY2U1ZDctMTI5Mi00NzAzLTljMmEtNzI5ZWVmODE1YmVkIiwicm9sZSI6Im5vZGUifQ.Hq0pS_h6gOSizdErZuYyTzYkyFj1458jSiZ3wJn_tNY',
    // seedUrl: 'rum://seed?v=1&e=0&n=0&b=Jd-Xt1_ySoWPmCh3tmijVA&c=szMuGxtbOnaz7a-uCdduQtHNKAhMGry_sCWKoKY0Log&g=ITKp_yM8TUq1M22VF2S8TQ&k=Aq9Bdxy03_5-Ngk5xhznF0McJwjw6H1_sgPXzDVC32pb&s=ahsY9PS8zC-bUMm5_FTzq7_TQBHlT4PflbfJRjz1x7lecv79Ydmu_csmOQLtXEqahqJlJD5MjPtSZQcpLwo-dAE&t=Fw_M2UqNnGQ&a=nft-bbs-test&y=group_timeline&u=http%3A%2F%2F127.0.0.1%3A64458%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyIyMTMyYTlmZi0yMzNjLTRkNGEtYjUzMy02ZDk1MTc2NGJjNGQiXSwiZXhwIjoxODE5NDUyMDIxLCJuYW1lIjoiYWxsb3ctMjEzMmE5ZmYtMjMzYy00ZDRhLWI1MzMtNmQ5NTE3NjRiYzRkIiwicm9sZSI6Im5vZGUifQ.k3xfpyoGshC6YHkzlRGyxTcnyjdoMHgTiKDa5WZZR-8',
    seedUrl: 'rum://seed?v=1&e=0&n=0&b=QaPjfi7LQ4yp2S60ngyJdw&c=fja8EJAAK_ZxLPcyLq-6L7HSKuli68wnhl4ImdwHh_A&g=uZvFqN6-SYGGu9SESABN0w&k=AjlWMMvVpXi9DLpoxmgJgD9ug2fDAaUNQCOhOq5PNfIc&s=bOh-m-h2vCbsS3Z3KBUNoYfB3D3ZyJx3Vf0W2dKibNgNp1Uj_f6U-YSo4MPLZM2QE3ipN7KklOCdoYHS9WT2zgE&t=FxBnshqivLo&a=nft-bbs-test-noe132.com&y=group_timeline&u=https%3A%2F%2Fnoe132.com%3A64459%3Fjwt%3DeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGxvd0dyb3VwcyI6WyJiOTliYzVhOC1kZWJlLTQ5ODEtODZiYi1kNDg0NDgwMDRkZDMiXSwiZXhwIjoxNjkzNDc4ODU1LCJuYW1lIjoibm9kZWp3dCIsInJvbGUiOiJub2RlIn0.BRl1QD0B-Dpngccs8dtsMzm5j-m_BCvet4XgRJx07cA',
    keystorePopup: false,
    // privateKey: '',
    keystore: '',
    password: '',
    passwordVisibility: false,
    rememberPassword: false,
    group: null as null | IGroup,
    step: Step.SavedLoginCheck,
    languageMenu: false,
    createWalletLoading: false,
    get canLogin() {
      return !!this.password && !!this.keystore;
    },
  }));

  // const languageButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // const handleChangeLanguage = action((lang: AllLanguages) => {
  //   langService.switchLang(lang);
  //   state.languageMenu = false;
  // });

  const handleNextStep = () => {
    if (state.step === Step.InputSeedUrl) {
      try {
        QuorumLightNodeSDK.cache.Group.add(state.seedUrl);
        const groups = QuorumLightNodeSDK.cache.Group.list();
        const group = groups[0];
        groups.forEach((v) => {
          QuorumLightNodeSDK.cache.Group.remove(v.groupId);
        });
        runInAction(() => {
          state.group = group;
          state.step = Step.PrepareJoinGroup;
        });
      } catch (e) {
        snackbarService.error(`解析失败 (${(e as Error).message})`);
        runInAction(() => {
          state.step = Step.SeedUrlParsingError;
        });
      }
      return;
    }
    if (state.step === Step.PrepareJoinGroup) {
      try {
        QuorumLightNodeSDK.cache.Group.clear();
        nodeService.joinGroup(state.seedUrl);
      } catch (e) {
        snackbarService.error(`加入失败 (${(e as Error).message})`);
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

  const handleAutoLogin = async () => {
    const keystore = store('keystore') ?? '';
    let password = store('password') ?? '123';
    let keyData;
    try {
      if (keystore) {
        keyData = await keyService.validate(keystore, password);
      }
    } catch (e) {}
    if (!keyData) {
      password = '123';
      keyData = await keyService.createRandom(password);
    }
    nodeService.joinGroup(state.seedUrl, keyData);
    store('keystore', keyData.keystore);
    store('seedUrl', state.seedUrl);
    store('password', password);
  };

  const handleShowKeystoreDialog = action(() => {
    state.keystorePopup = true;
    state.keystore = store('keystore') ?? '';
    state.password = store('password') ?? '';
    state.rememberPassword = state.canLogin;
  });

  const handleLoginConfirm = async () => {
    let data;
    try {
      data = await keyService.validate(state.keystore, state.password);
    } catch (e) {
      snackbarService.error('keystore或密码错误');
      return;
    }
    store('keystore', state.keystore);
    store('seedUrl', state.seedUrl);
    if (state.rememberPassword) {
      store('password', state.password);
    } else {
      store('password', '');
    }
    nodeService.joinGroup(state.seedUrl, data);
  };

  const handleLoginAnonymous = () => {
    nodeService.joinGroup(state.seedUrl);
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

  const savedLoginCheck = async () => {
    const seedUrl = state.seedUrl;
    const keystore = store('keystore');
    const password = store('password');
    if (seedUrl && keystore && password) {
      let data;
      try {
        data = await keyService.validate(keystore, password);
      } catch (e) {
        snackbarService.error('keystore或密码错误');
        return;
      }
      try {
        nodeService.joinGroup(state.seedUrl, data);
        return;
      } catch (e) {}
      return;
    }
    runInAction(() => {
      state.step = Step.InputSeedUrl;
      handleNextStep();
    });
  };

  useEffect(() => {
    savedLoginCheck();
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
        className="text-black"
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
        {/* <Button
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
        </ThemeLight> */}
      </div>
      <div
        className="flex-col flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `url('${chooseImgByPixelRatio({ x1: bgImg1x, x2: bgImg2x, x3: bgImg3x })}')`,
        }}
      >
        <div className="flex flex-center flex-1">
          <div className="relative flex-col flex-center bg-black/70 w-[720px] h-[330px] rounded-[10px]">
            {state.step === Step.SavedLoginCheck && (
              <div className="flex-col flex-center">
                <CircularProgress className="text-white/70" />
              </div>
            )}
            {state.step === Step.InputSeedUrl && (
              <div className="flex-col flex-center">
                <div className="text-white text-18">
                  加入 RumPot 种子网络
                </div>
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
              <div className="flex-col flex-center">
                <div className="text-white">
                  种子文本解析错误
                </div>
                <div className="mt-12 text-white text-16">
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
                    onClick={action(() => { state.step = 0; })}
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
              <div className="flex-col items-center pt-12">
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
                  groupName={state.group?.groupName ?? ''}
                  size={100}
                />
                {/* <div className="w-25 h-25 rounded-full overflow-hidden bg-white absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
                  <div className="bg-blue-400/70 rounded-full h-full w-full" />
                </div> */}
                <div className="mt-0 text-gray-f2 text-18 truncate max-w-[400px]">
                  {state.group?.groupName}
                </div>

                <Button
                  className="text-rum-orange rounded-full text-16 px-12 py-2 mt-4"
                  color="inherit"
                  variant="outlined"
                  onClick={handleAutoLogin}
                >
                  注册/登录
                </Button>
                <button
                  className="text-gray-9c text-14 mt-4"
                  onClick={handleLoginAnonymous}
                >
                  以游客身份进入
                </button>
                <Button
                  className="absolute text-gray-9c text-12 mt-4 bottom-2 right-2 px-2 normal-case"
                  variant="text"
                  size="small"
                  onClick={handleShowKeystoreDialog}
                >
                  输入keystore
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center px-10 h-12 bg-white">
        <img src={logoImg} alt="" />
        <span className="px-2">·</span>
        <div className="flex flex-center gap-x-12 text-14">
          {[
            ['https://rumsystem.net/', '关于'],
            ['https://rumsystem.net/developers', '文档'],
            ['https://rumsystem.net/faq/howtocreateseednet', '怎样创建 RumPot 种子网络？'],
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
                  label="记住密码"
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
    </ThemeLight>
  </>);
});
