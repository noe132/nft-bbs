import React, { useRef, useMemo } from 'react';
import { useLocation, useParams, Link, matchPath } from 'react-router-dom';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import type { GroupStatus } from 'rum-port-server';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { utils } from 'rum-sdk-browser';
import {
  AdminPanelSettings,
  Check,
  Close, Logout, MoreVert, NotificationsNone,
  PersonOutline, Search,
} from '@mui/icons-material';
import {
  Badge, Button, Divider, Fade, FormControl, IconButton, Input, InputBase,
  InputLabel, Menu, MenuItem, OutlinedInput, Popover, Portal, Tab, Tabs,
} from '@mui/material';

import CamaraIcon from 'boxicons/svg/regular/bx-camera.svg?fill-icon';
import EditAltIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
import NFTIcon from '~/assets/icons/icon-nft.svg?fill-icon';
import LanguageIcon from '~/assets/icons/language-select.svg?fill-icon';
import { lang, routeUrlPatterns, ThemeLight, usePageState, useWiderThan } from '~/utils';
import {
  nodeService, keyService, dialogService,
  routerService, loginStateService, nftService, langService, langName, AllLanguages,
} from '~/service';
import { editProfile } from '~/modals';
import { GroupAvatar, GroupCard, NFTSideBox, SiteLogo, UserAvatar } from '~/components';

import { createPostlistState } from '../PostList';

export const Header = observer((props: { className?: string }) => {
  const routeParams = useParams();
  const routeLocation = useLocation();
  const postlistState = usePageState('postlist', routeLocation.key, createPostlistState, 'readonly');
  const state = useLocalObservable(() => ({
    userDropdown: false,
    menu: false,
    langMenu: false,
    mobileGroupCard: {
      open: false,
      showNewPost: false,
      showPostlist: false,
    },
    get profile() {
      return nodeService.state.myProfile;
    },
    get isAdmin() {
      return nodeService.state.config.admin.includes(keyService.state.address);
    },
    get showNftRequestButton() {
      const conditions = [
        !!nodeService.state.config.currentGroup.nft,
        !nftService.state.tokenIdMap.get(keyService.state.address)?.loading,
        !nftService.state.tokenIds.length,
        keyService.state.address,
      ];
      return conditions.every((v) => v);
    },
  }));

  const isPC = useWiderThan(960);

  const isPostlistPage = !!matchPath(routeUrlPatterns.postlist, routeLocation.pathname);
  const isNotificationPage = !!matchPath(routeUrlPatterns.notification, routeLocation.pathname);
  const isUserProfilePage = !!matchPath(routeUrlPatterns.userprofile, routeLocation.pathname);

  const mobileGroupIcon = useRef<HTMLDivElement>(null);
  const userBoxRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const mobileSearchInput = useRef<HTMLInputElement>(null);

  const handleChangeFilter = action((filter: 'all' | 'week' | 'month' | 'year') => {
    if (!postlistState) { return; }
    postlistState.mode.hot = filter;
    postlistState.loadPosts();
  });

  const handleChangeTab = action((tab: number) => {
    if (tab === 2) { return; }
    if (!postlistState) { return; }
    postlistState.header.tab = tab;
    if (tab === 0) { postlistState.mode.type = 'normal'; }
    if (tab === 1) { postlistState.mode.type = 'hot'; }
    postlistState.loadPosts();
  });

  const handleSearchInputKeydown = action((e: React.KeyboardEvent) => {
    if (!postlistState) { return; }
    if (e.key === 'Enter' && postlistState.header.searchTerm) {
      e.preventDefault();
      runInAction(() => {
        postlistState.mode.type = 'search';
        postlistState.mode.search = postlistState.header.searchTerm;
        if (!isPC) {
          postlistState.header.searchMode = false;
        }
      });
      postlistState.loadPosts();
    }
    if (e.key === 'Escape') {
      handleExitSearchMode();
    }
  });

  const handleOpenSearchInput = action(() => {
    if (!postlistState) { return; }
    if (!isPC) {
      postlistState.header.searchTerm = '';
    }
    postlistState.header.searchMode = !postlistState.header.searchMode;
    setTimeout(() => {
      searchInput.current?.focus();
      mobileSearchInput.current?.focus();
    });
  });

  const handleExitSearchMode = action(() => {
    if (!postlistState) { return; }
    postlistState.header.searchMode = false;
    if (postlistState.mode.type === 'search') {
      runInAction(() => {
        postlistState.mode.type = 'normal';
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
    if (isUserProfilePage && routeParams.userAddress === state.profile?.userAddress) {
      return;
    }
    if (!state.profile) {
      routerService.navigate({ page: 'userprofile', userAddress: keyService.state.address });
    } else {
      routerService.navigate({ page: 'userprofile', userAddress: state.profile.userAddress });
    }
  });

  const handleShowAccountInfo = action(() => {
    state.menu = false;
    if (keyService.state.keys?.type === 'keystore') {
      dialogService.open({
        title: lang.header.accountInfo,
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

  const handleBackToLogin = action((jumpToLogin = false) => {
    state.userDropdown = false;
    state.menu = false;
    if (jumpToLogin) {
      loginStateService.state.autoOpenGroupId = nodeService.state.groupId;
    }
    loginStateService.state.autoLoginGroupId = null;
    window.location.href = '/';
  });

  const handleClickLogo = action(() => {
    loginStateService.state.autoLoginGroupId = null;
  });

  const handleOpenGroupCard = action(() => {
    state.mobileGroupCard = {
      open: true,
      showNewPost: !matchPath(routeUrlPatterns.newpost, routeLocation.pathname),
      showPostlist: !matchPath(routeUrlPatterns.postlist, routeLocation.pathname),
    };
  });

  const handleOpenAdmin = action(() => {
    if (!loginStateService.state.groups.admin) {
      loginStateService.state.groups.admin = {};
    }
    if (keyService.state.keys) {
      if (keyService.state.keys.type === 'keystore') {
        const { type, ...rest } = keyService.state.keys;
        loginStateService.state.groups.admin.keystore = { ...rest };
      }
      if (keyService.state.keys.type === 'mixin') {
        const { type, ...rest } = keyService.state.keys;
        loginStateService.state.groups.admin.mixin = {
          mixinJWT: rest.jwt,
          userName: rest.user.display_name,
        };
      }
    }
    window.open('/admin');
  });

  const handleNftRequest = action(() => {
    nftService.state.requestDialog.open = true;
  });

  const handleOpenGroup = action((v: GroupStatus) => {
    window.open(`/${v.shortName || v.id}`);
    state.menu = false;
  });

  const handleOpenLanguageMenu = action(() => {
    state.menu = false;
    state.langMenu = true;
  });

  const handleChangeLanguage = action((lang: AllLanguages) => {
    langService.switchLang(lang);
    state.langMenu = false;
  });

  const notificationLink = useMemo(() => {
    const match = matchPath(routeUrlPatterns.notification, routeLocation.pathname);
    return match
      ? routerService.getPath({ page: 'postlist' })
      : routerService.getPath({ page: 'notification' });
  }, [routeLocation.pathname]);

  const loginedPorts = nodeService.state.groups
  // .filter((v) => v.id !== nodeService.state.groupId)
    .filter((v) => loginStateService.state.groups[v.id]?.lastLogin)
    .map((v) => ({
      group: v,
      loginState: loginStateService.state.groups[v.id]!,
    }));

  const computedMobileTab = postlistState?.mode.type === 'search'
    ? 2
    : postlistState?.header.tab ?? 0;

  return (<>
    {isPC && (<React.Fragment key="pc">
      <div className="h-[60px]" />
      <div
        className={classNames(
          'fixed top-0 left-0 right-0 z-50 flex flex-center px-5 h-[60px] bg-[#0d1d37]',
          props.className,
        )}
      >
        <a
          className="s1360:hidden block absolute left-5 flex-none h-auto"
          href="/"
          onMouseUp={handleClickLogo}
        >
          <SiteLogo />
        </a>
        <div className="flex w-[1100px] justify-between self-stretch gap-x-4">
          <div className="flex items-center flex-1">
            <a
              className="s1360:block hidden flex-none h-auto mr-4"
              href="/"
              onClick={handleClickLogo}
            >
              <SiteLogo />
            </a>
            {isPostlistPage && !!postlistState && !postlistState.header.searchMode && (
              <div className="flex gap-x-4">
                <Tabs
                  value={postlistState.header.tab}
                  TabIndicatorProps={{ className: '!bg-rum-orange h-[3px]' }}
                >
                  {[lang.postlist.latest, lang.postlist.hotest].map((v, i) => (
                    <Tab
                      className="text-gray-9c text-20 h-[60px] px-8"
                      classes={{ selected: '!text-rum-orange' }}
                      label={v}
                      key={i}
                      onClick={() => handleChangeTab(i)}
                    />
                  ))}
                </Tabs>
                {postlistState.header.tab === 1 && (
                  <div className="flex flex-center gap-x-2">
                    {([
                      [lang.postlist.week, 'week'],
                      [lang.postlist.month, 'month'],
                      [lang.postlist.year, 'year'],
                      [lang.postlist.all, 'all'],
                    ] as const).map(([t, v], i) => (
                      <Button
                        className={classNames(
                          'min-w-0 px-3',
                          postlistState?.mode.hot === v && 'text-rum-orange',
                          postlistState?.mode.hot && 'text-gray-9c',
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

            {!!postlistState && postlistState.header.searchMode && isPostlistPage && (
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
                  placeholder={lang.postlist.searchPlaceholder}
                  value={postlistState.header.searchTerm}
                  onChange={(action((e) => { postlistState.header.searchTerm = e.target.value; }))}
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
              {!!postlistState && isPostlistPage && (
                <Button
                  className={classNames(
                    'text-white p-0 w-10 h-10 min-w-0',
                    postlistState.header.searchMode && 'bg-white/10 hover:bg-white/15',
                  )}
                  onClick={handleOpenSearchInput}
                  variant="text"
                >
                  <Search className="text-28" />
                </Button>
              )}
              {nodeService.state.logined && (
                <Link to={notificationLink}>
                  <Button
                    className={classNames(
                      'text-white p-0 w-10 h-10 min-w-0',
                      isNotificationPage && 'bg-white/10 hover:bg-white/15',
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
                onClick={() => handleBackToLogin(true)}
              >
                {lang.header.login}
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
                {nodeService.state.logined ? nodeService.state.profileName : lang.header.anonymous}
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
    </React.Fragment>)}

    {!isPC && (<React.Fragment key="mb">
      <div
        className={classNames(
          isPostlistPage && !!postlistState && 'h-[120px]',
          !(isPostlistPage && !!postlistState) && 'h-[60px]',
        )}
      />
      <div
        className={classNames(
          'fixed top-0 left-0 right-0 z-50 flex-col items-stretch bg-[#0d1d37]',
          isPostlistPage && !!postlistState && 'h-[120px]',
          !(isPostlistPage && !!postlistState) && 'h-[60px]',
          props.className,
        )}
      >
        <div className="flex justify-between items-center gap-x-4 h-[60px] px-5">
          <div
            ref={mobileGroupIcon}
            onClick={handleOpenGroupCard}
          >
            <GroupAvatar
              className="flex cursor-pointer border border-white/80 overflow-hidden"
              size={32}
              fontSize={16}
              square
            />
          </div>
          <div className="flex items-center gap-4">
            {!!postlistState && isPostlistPage && (
              <Button
                className={classNames(
                  'text-white p-0 w-10 h-10 min-w-0',
                  postlistState.header.searchMode && 'bg-white/10 hover:bg-white/15',
                )}
                onClick={handleOpenSearchInput}
                variant="text"
              >
                <Search className="text-28" />
              </Button>
            )}
            {nodeService.state.logined && (
              <Link to={notificationLink}>
                <Button
                  className={classNames(
                    'text-white p-0 w-10 h-10 min-w-0',
                    isNotificationPage && 'bg-white/10 hover:bg-white/15',
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

            {!nodeService.state.logined && (
              <Button
                className="rounded-full py-1 px-5 text-16"
                color="rum"
                onClick={() => handleBackToLogin(true)}
              >
                {lang.header.login}
              </Button>
            )}
            {nodeService.state.logined && (
              <div
                className="flex flex-center gap-x-3 cursor-pointer h-10 w-10"
                ref={userBoxRef}
                onClick={action(() => {
                  if (nodeService.state.logined) { state.userDropdown = true; }
                })}
              >
                <UserAvatar profile={nodeService.state.myProfile} />
              </div>
            )}
            <IconButton
              className="text-white"
              onClick={action(() => { state.menu = true; })}
              ref={menuButton}
            >
              <MoreVert />
            </IconButton>
          </div>
        </div>
        {isPostlistPage && !!postlistState && (
          <div className="flex self-stretch gap-x-4 border-t border-white/30">
            <div className="flex gap-x-2">
              <Tabs
                value={computedMobileTab}
                TabIndicatorProps={{ className: '!bg-rum-orange h-[3px]' }}
              >
                {[
                  lang.postlist.latest,
                  lang.postlist.hotest,
                  postlistState.mode.type === 'search' ? lang.postlist.search : '',
                ].filter((v) => v).map((v, i) => (
                  <Tab
                    className="text-gray-9c text-20 h-[60px] px-8 !min-w-0 !px-6"
                    classes={{ selected: '!text-rum-orange' }}
                    label={v}
                    key={i}
                    onClick={() => handleChangeTab(i)}
                  />
                ))}
              </Tabs>
              {computedMobileTab === 1 && (
                <div className="flex items-stretch gap-x-0">
                  {([
                    [lang.postlist.week, 'week'],
                    [lang.postlist.month, 'month'],
                    [lang.postlist.year, 'year'],
                    [lang.postlist.all, 'all'],
                  ] as const).map(([t, v], i) => (
                    <Button
                      className={classNames(
                        'min-w-0 px-3',
                        postlistState?.mode.hot === v && 'text-rum-orange',
                        postlistState?.mode.hot && 'text-gray-9c',
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
          </div>
        )}
      </div>
    </React.Fragment>)}

    {!isPC && (
      <Popover
        className="bg-black/30"
        classes={{
          paper: 'bg-none bg-transparent shadow-0',
        }}
        anchorEl={mobileGroupIcon.current}
        open={state.mobileGroupCard.open}
        onClose={action(() => { state.mobileGroupCard.open = false; })}
      >
        <div className="w-[280px]">
          <div className="w-[280px]">
            <GroupCard
              className="mt-16"
              showNewPost={state.mobileGroupCard.showNewPost}
              showPostlist={state.mobileGroupCard.showPostlist}
              onClose={action(() => { state.mobileGroupCard.open = false; })}
              mobile
            />
            <NFTSideBox mobile />
          </div>
        </div>
      </Popover>
    )}

    {!isPC && !!postlistState && isPostlistPage && (
      <Portal>
        <Fade in={postlistState.header.searchMode}>
          <div className="flex-col fixed inset-0 z-[50]">
            <div className="w-full bg-white p-4">
              <InputBase
                className="flex-none bg-black/5 w-full rounded text-black"
                inputProps={{
                  className: 'placeholder:text-black placeholder:opacity-40 px-3 py-1',
                  style: { WebkitTextFillColor: 'unset' },
                }}
                inputRef={mobileSearchInput}
                value={postlistState.header.searchTerm}
                onChange={(action((e) => { postlistState.header.searchTerm = e.target.value; }))}
                placeholder={lang.postlist.searchPlaceholder}
                multiline
                maxRows={5}
                onKeyDown={handleSearchInputKeydown}
              />
            </div>
            <div
              className="flex flex-center flex-1 duration-150 bg-black/50"
              onClick={handleExitSearchMode}
            />
          </div>
        </Fade>
      </Portal>
    )}

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
            className="rounded-full font-normal py-px pt-[2px] px-8 mt-4 text-12"
            variant="outlined"
            color="link"
            onClick={handleOpenUserProfile}
          >
            {lang.header.myPosts}
          </Button>

          {!!loginedPorts.length && (
            <div className="mt-4 w-full -mb-2">
              <Divider />
              <div className="text-center text-12 text-gray-9c mt-3 pb-2">
                {lang.portList.joinedPorts}
              </div>
              {loginedPorts.map((v) => (
                <MenuItem
                  className="flex justify-start items-center gap-4 px-4 py-[5px] font-normal hover:bg-black/5 font-default"
                  key={v.group.id}
                  onClick={() => handleOpenGroup(v.group)}
                >
                  <GroupAvatar
                    className="shadow-1 flex-none"
                    groupId={v.group.id}
                    groupName={utils.restoreSeedFromUrl(v.group.mainSeedUrl).group_name}
                    size={30}
                  />
                  <div className="flex-col items-start overflow-hidden">
                    <div className="text-link text-14 w-full truncate">
                      {utils.restoreSeedFromUrl(v.group.mainSeedUrl).group_name}
                    </div>
                    <div className="text-gray-9c text-12 w-full truncate">
                      {v.loginState.lastLogin === 'keystore' && `Keystore: ${v.loginState.keystore?.address.slice(0, 10)}`}
                      {v.loginState.lastLogin === 'mixin' && `Mixin: ${v.loginState.mixin?.userName}`}
                    </div>
                  </div>
                </MenuItem>
              ))}
            </div>
          )}

          <Button
            className="rounded-none w-full border-solid border-t border-black/10 mt-4 h-12 font-normal text-14"
            variant="text"
            onClick={() => handleBackToLogin(true)}
          >
            {lang.header.logout}
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
        {[
          keyService.state.keys?.type === 'keystore' && {
            content: (
              <div className="flex gap-x-2 mr-2">
                <div className="flex flex-center w-5">
                  <PersonOutline className="text-22 text-blue-500/90" />
                </div>
                {lang.header.myAccountInfo}
              </div>
            ),
            onClick: handleShowAccountInfo,
          },
          {
            content: (
              <div className="flex items-center gap-x-2 mr-2">
                <div className="flex flex-center w-5">
                  <LanguageIcon className="text-black text-24" />
                </div>
                <span>
                  Language
                  <span className="text-gray-9c text-12 ml-4">
                    {langService.state.langName}
                  </span>
                </span>
              </div>
            ),
            onClick: handleOpenLanguageMenu,
          },
          state.isAdmin && {
            content: (
              <div className="flex gap-x-2 mr-2">
                <div className="flex flex-center w-5">
                  <AdminPanelSettings className="text-22" />
                </div>
                管理后台
              </div>
            ),
            onClick: handleOpenAdmin,
          },
          state.showNftRequestButton && {
            content: (
              <div className="flex gap-x-2 mr-2">
                <div className="flex flex-center w-5">
                  <NFTIcon className="text-22 text-black" />
                </div>
                {lang.nftBox.request}
              </div>
            ),
            onClick: handleNftRequest,
          },
          {
            content: (
              <div className="flex gap-x-2 mr-2">
                <div className="flex flex-center w-5">
                  <Logout className="text-22 text-amber-500/90" />
                </div>
                <span className="text-rum-orange">
                  {lang.header.exitCurrentPort}
                </span>
              </div>
            ),
            onClick: () => handleBackToLogin(),
          },
        ].filter(<T extends unknown>(v: T | boolean): v is T => !!v).flatMap((v, i) => [
          i !== 0 && <Divider key={`${i}-divide`} />,
          <MenuItem
            className="py-2 px-6"
            onClick={v.onClick}
            key={i}
          >
            {v.content}
          </MenuItem>,
        ].filter((v) => v))}
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
