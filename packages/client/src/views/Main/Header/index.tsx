import React, { useRef } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { ethers } from 'ethers';
import * as QuorumLightNodeSDK from 'quorum-light-node-sdk';
import {
  Check, Close, Logout, MoreVert, NotificationsNone,
  PersonOutline, Search,
} from '@mui/icons-material';
import {
  Badge, Button, FormControl, IconButton, Input,
  InputLabel, Menu, MenuItem, OutlinedInput, Popover, Tab, Tabs,
} from '@mui/material';

import CamaraIcon from 'boxicons/svg/regular/bx-camera.svg?fill-icon';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
// import LanguageIcon from '~/assets/icons/language-select.svg?fill-icon';
import { setLoginState, ThemeLight, usePageState } from '~/utils';
import {
  nodeService, langService, keyService,
  AllLanguages, langName, dialogService,
} from '~/service';
import { editProfile } from '~/modals';
import { ACCOUNT1, ACCOUNT2 } from '~/utils/testAccount';
import { SiteLogo, UserAvatar } from '~/components';

import { createPostlistState } from '../PostList';

type HotestFilter = string;

export const Header = observer((props: { className?: string }) => {
  const routeParams = useParams();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const postlistState = usePageState('postlist', routeLocation.key, createPostlistState, 'readonly');
  const state = useLocalObservable(() => ({
    tab: 0,
    userDropdown: false,
    searchTerm: '',
    searchMode: false,
    menu: false,
    langMenu: false,
    filter: 'all' as HotestFilter,

    get profile() {
      return nodeService.state.myProfile;
    },
  }));

  const userBoxRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const handleChangeLanguage = action((lang: AllLanguages) => {
    langService.switchLang(lang);
    state.langMenu = false;
  });

  const handleChangeFilter = action((filter: HotestFilter) => {
    state.filter = filter;
  });

  const handleChangeTab = action((tab: number) => {
    state.tab = tab;
  });

  const handleSearchInputKeydown = action((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state.searchTerm) {
      if (!postlistState) { return; }
      runInAction(() => {
        postlistState.mode = { type: 'search', search: state.searchTerm };
      });
      postlistState.loadPosts();
    }
    if (e.key === 'Escape') {
      handleExitSearchMode();
    }
  });

  const handleOpenSearchInput = action(() => {
    state.searchMode = !state.searchMode;
    setTimeout(() => {
      searchInput.current?.focus();
    });
  });

  const handleExitSearchMode = action(() => {
    state.searchMode = false;
    if (!postlistState) { return; }
    if (postlistState.mode.type === 'search') {
      runInAction(() => {
        postlistState.mode = { type: 'normal' };
      });
      postlistState.loadPosts();
    }
  });

  const handleEditProfile = action(() => {
    state.userDropdown = false;
    editProfile({
      avatar: state.profile?.avatar ?? '',
      name: state.profile?.name ?? '',
      // intro: state.profile?.intro ?? '',
    });
  });

  const handleOpenUserProfile = action(() => {
    state.userDropdown = false;
    if (routeLocation.pathname === '/userprofile' && routeParams.userAddress === state.profile?.userAddress) {
      return;
    }
    if (!state.profile) {
      navigate(`/userprofile/${nodeService.state.groupId}/${keyService.state.address}`);
    } else {
      navigate(`/userprofile/${state.profile.groupId}/${state.profile.userAddress}`);
    }
  });

  const handleChangeAccount = async (type: '1' | '2' | 'new') => {
    let wallet;
    if (type === '1') {
      const privateKey = ACCOUNT1.privateKey;
      wallet = new ethers.Wallet(privateKey);
    } else if (type === '2') {
      const privateKey = ACCOUNT2.privateKey;
      wallet = new ethers.Wallet(privateKey);
    } else {
      wallet = ethers.Wallet.createRandom();
    }
    const password = '123';
    const keystore = await wallet.encrypt(password, {
      scrypt: {
        N: 64,
      },
    });

    setLoginState({
      keystore,
      password,
    });
    QuorumLightNodeSDK.cache.Group.clear();
    if (window.location.pathname !== '/') {
      history.replaceState(null, '', '/');
    }
    window.location.reload();
  };

  const handleShowAccountInfo = action(() => {
    state.menu = false;
    if (keyService.state.keys?.type === 'keystore') {
      dialogService.open({
        title: '账号信息',
        content: (
          <div className="flex-col gap-y-4 py-2 w-[400px]">
            <FormControl size="small">
              <InputLabel>keystore</InputLabel>
              <OutlinedInput
                className="text-14 break-all"
                size="small"
                label="keystore"
                type="text"
                multiline
                rows={10}
                onFocus={(e) => e.target.select()}
                value={keyService.state.keys.keystore}
              />
            </FormControl>
            <FormControl size="small">
              <InputLabel>password</InputLabel>
              <OutlinedInput
                size="small"
                label="keystore"
                type="text"
                multiline
                onFocus={(e) => e.target.select()}
                value={keyService.state.keys.password}
              />
            </FormControl>
          </div>
        ),
        cancel: null,
        maxWidth: 0,
      });
    }
  });

  const handleBackToLogin = action(() => {
    if (routeLocation.pathname !== '/') {
      navigate('/', { replace: true });
    }
    state.userDropdown = false;
    state.menu = false;
    setLoginState({ autoLogin: null });
    window.location.reload();
  });

  const handleClickLogo = () => {
    if (routeLocation.pathname === '/') {
      postlistState?.loadPosts();
    } else {
      navigate('/');
    }
  };

  return (<>
    <div className="h-[60px]" />
    <div
      className={classNames(
        'fixed top-0 left-0 right-0 z-50 flex flex-center px-5 h-[60px] bg-[#0d1d37] bg-white',
        props.className,
      )}
    >
      <button
        className="s1360:hidden block absolute left-5 flex-none h-auto"
        onClick={handleClickLogo}
      >
        <SiteLogo />
      </button>
      <div className="flex w-[1100px] justify-between self-stretch gap-x-4">
        <div className="flex items-center flex-1">
          <button
            className="s1360:block hidden flex-none h-auto mr-4"
            onClick={handleClickLogo}
          >
            <SiteLogo />
          </button>
          {!state.searchMode && routeLocation.pathname === '/' && (
            <div className="flex gap-x-4">
              {false && (
                <Tabs
                  value={state.tab}
                  TabIndicatorProps={{ className: '!bg-rum-orange h-[3px]' }}
                >
                  {/* {['最新', '最热'].map((v, i) => ( */}
                  {['最新'].map((v, i) => (
                    <Tab
                      className="text-gray-9c text-20 h-[60px] px-8"
                      classes={{ selected: '!text-rum-orange' }}
                      label={v}
                      key={i}
                      onClick={() => handleChangeTab(i)}
                    />
                  ))}
                </Tabs>
              )}
              {state.tab === 1 && (
                <div className="flex flex-center gap-x-2">
                  {([['周', 'week'], ['月', 'month'], ['年', 'year'], ['一直', 'all']] as const).map(([t, v], i) => (
                    <Button
                      className={classNames(
                        'min-w-0 px-4',
                        state.filter === v && 'text-rum-orange',
                        state.filter !== v && 'text-gray-9c',
                      )}
                      key={i}
                      color="inherit"
                      variant="text"
                      disableRipple
                      onClick={() => handleChangeFilter(v)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {state.searchMode && routeLocation.pathname === '/' && (
            <div className="flex flex-1 items-center">
              <Input
                className="flex-1 max-w-[550px] text-white text-14 pb-px"
                sx={{
                  '&:hover:not(.Mui-disabled)::before': { borderColor: '#9c9c9c' },
                  '&::before': { borderColor: '#9c9c9c' },
                  '&::after': { borderColor: 'white' },
                  '& .MuiInput-input::placeholder': { color: '#9c9c9c', opacity: 1 },
                }}
                startAdornment={<Search className="text-gray-9c mr-1 text-26" />}
                placeholder="搜索种子网络…"
                value={state.searchTerm}
                onChange={(action((e) => { state.searchTerm = e.target.value; }))}
                onKeyDown={handleSearchInputKeydown}
                inputProps={{ ref: searchInput }}
              />
              <IconButton onClick={handleExitSearchMode}>
                <Close className="text-white" />
              </IconButton>
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-4">
          <div className="flex justify-end items-center gap-x-4 mr-8">
            {/* {{
              key: 'share',
              icon: <Share className="text-24" />,
              onClick: () => 1,
              active: false,
            }} */}
            {routeLocation.pathname === '/' && (
              <Button
                className={classNames(
                  'text-white p-0 w-10 h-10 min-w-0',
                  state.searchMode && 'bg-white/10 hover:bg-white/15',
                )}
                onClick={handleOpenSearchInput}
                variant="text"
              >
                <Search className="text-28" />
              </Button>
            )}
            {nodeService.state.logined && (
              <Link to={routeLocation.pathname === '/notification' ? '/' : '/notification'}>
                <Button
                  className={classNames(
                    'text-white p-0 w-10 h-10 min-w-0',
                    routeLocation.pathname === '/notification' && 'bg-white/10 hover:bg-white/15',
                  )}
                  variant="text"
                >
                  <Badge
                    className="transform"
                    classes={{ badge: 'bg-red-500 text-white' }}
                    badgeContent={nodeService.state.notification.unreadCount}
                  >
                    <NotificationsNone className="text-26" />
                  </Badge>
                </Button>
              </Link>
            )}
          </div>
          {!nodeService.state.logined && (
            <Button
              className="rounded-full py-px px-5 text-16"
              color="rum"
              onClick={handleBackToLogin}
            >
              登录
            </Button>
          )}
          <div
            className="flex flex-center gap-x-3 cursor-pointer"
            ref={userBoxRef}
            onClick={action(() => {
              if (nodeService.state.logined) {
                state.userDropdown = true;
              }
            })}
          >
            <UserAvatar profile={nodeService.state.myProfile} />
            <span className="text-white">
              {nodeService.state.logined ? nodeService.state.profileName : '游客'}
            </span>
          </div>
          <IconButton
            className="text-white"
            onClick={action(() => { state.menu = true; })}
            ref={menuButton}
          >
            <MoreVert />
          </IconButton>
        </div>
      </div>
    </div>

    <ThemeLight>
      <Popover
        className="mt-4"
        open={state.userDropdown}
        onClose={action(() => { state.userDropdown = false; })}
        anchorEl={userBoxRef.current}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        disableScrollLock
      >
        <div className="flex-col items-center w-[240px]">
          <button
            className="relative group w-12 h-12 mt-6 cursor-pointer rounded-full"
            onClick={handleEditProfile}
          >
            <UserAvatar
              className="shadow-2"
              size={48}
              profile={nodeService.state.myProfile}
            >
              <div className="absolute right-0 bottom-0 border-black border rounded-full bg-white p-px hidden group-hover:block">
                <CamaraIcon className="text-12" />
              </div>
            </UserAvatar>
          </button>
          <button
            className="mt-4 cursor-pointer flex flex-center"
            onClick={handleEditProfile}
          >
            <span className="align-center truncate max-w-[200px]">
              {nodeService.state.profileName}
            </span>
            <EditAltIcon className="inline-block text-17" />
          </button>
          <Button
            className="rounded-full font-normal pb-0 pt-px px-8 mt-4 text-12"
            variant="outlined"
            color="link"
            onClick={handleOpenUserProfile}
          >
            我的主页
          </Button>
          <Button
            className="rounded-none w-full border-solid border-t border-black/10 mt-6 h-12 font-normal text-14"
            variant="text"
            onClick={handleBackToLogin}
          >
            退出登录
          </Button>
        </div>
      </Popover>

      <Menu
        className="mt-1"
        open={state.menu}
        anchorEl={menuButton.current}
        onClose={action(() => { state.menu = false; })}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        disableScrollLock
      >
        {/* <MenuItem onClick={action(() => { state.menu = false; state.langMenu = true; })}>
          <div className="flex gap-x-3 mr-2">
            <LanguageIcon className="text-black text-20" />
            <div className="flex-col gap-y-[2px]">
              <div className="text-14">
                Language
              </div>
              <div className="text-12 text-gray-9c">
                {langService.state.langName}
              </div>
            </div>
          </div>
        </MenuItem> */}
        {([
          keyService.state.keys?.type === 'keystore' && {
            text: '我的账号信息',
            onClick: handleShowAccountInfo,
            icon: <PersonOutline className="text-22 text-blue-500/90" />,
          },
          process.env.NODE_ENV === 'development' && {
            text: '使用账号1',
            onClick: () => handleChangeAccount('1'),
            icon: '',
          },
          process.env.NODE_ENV === 'development' && {
            text: '使用账号2',
            onClick: () => handleChangeAccount('2'),
            icon: '',
          },
          // process.env.NODE_ENV === 'development' && { text: '使用新号', onClick: () => handleChangeAccount('new') },
          {
            text: '退出',
            onClick: handleBackToLogin,
            icon: <Logout className="text-22 text-amber-500/90" />,
          },
        ] as const).filter(<T extends unknown>(v: T | false): v is T => !!v).map((v, i) => (
          <MenuItem onClick={v.onClick} key={i}>
            <div className="flex gap-x-2 mr-2">
              <div className="flex flex-center w-5">
                {v.icon}
              </div>
              {v.text}
            </div>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        className="mt-1"
        open={state.langMenu}
        anchorEl={menuButton.current}
        onClose={action(() => { state.langMenu = false; })}
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
  </>);
});
