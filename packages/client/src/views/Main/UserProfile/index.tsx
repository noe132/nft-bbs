import { useEffect, useRef } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import RemoveMarkdown from 'remove-markdown';
import { format } from 'date-fns';
import type { Counter, Post } from 'rum-port-server';
import { Button, CircularProgress, ClickAwayListener, IconButton, Popover, Tooltip } from '@mui/material';
import { Close, ExpandMore, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { ScrollToTopButton, BackButton, UserAvatar, UserCard, NFTIcon, Scrollable } from '~/components';
import { imageZoomService, keyService, nftService, nodeService, routerService } from '~/service';
import { ago, lang, runLoading, ThemeLight, usePageState, useWiderThan } from '~/utils';
import { editProfile } from '~/modals';
import { PortList } from './PortList';

export const UserProfile = observer((props: { className?: string }) => {
  const routeParams = useParams<{ groupId: string, userAddress: string }>();
  const routeLocation = useLocation();
  const state = usePageState('userprofile', routeLocation.key, () => ({
    inited: false,
    likeLoading: false,
    profileLoading: true,

    posts: [] as Array<Post>,
    offset: 0,
    limit: 20 as const,
    postLoading: false,
    postDone: false,

    intersectionRatio: 0,
    pauseAutoLoading: false,

    nftTradeTooltip: false,
    ntfPopup: {
      open: false,
      nft: null as null | number,
    },

    get nfts() {
      return routeParams.userAddress
        ? nftService.state.tokenIdMap.get(routeParams.userAddress)?.ids ?? []
        : [];
    },
    get nftLoading() {
      return routeParams.userAddress
        ? !!nftService.state.tokenIdMap.get(routeParams.userAddress)?.loading ?? false
        : false;
    },
    get hasNFT() {
      return !!this.nfts.length;
    },
    get contractAddress() {
      return nodeService.config.get().nft ?? '';
    },
    get profile() {
      return routeParams.userAddress
        ? nodeService.profile.getComputedProfile(routeParams.userAddress)
        : null;
    },
    get selfProfile() {
      return this.profile?.userAddress === keyService.state.address;
    },
    get fistPostTime() {
      const userAddress = state.profile?.userAddress;
      if (!userAddress) { return null; }
      return nodeService.state.profile.firstPostMap.get(userAddress) ?? null;
    },
    get totalPosts() {
      const userAddress = state.profile?.userAddress;
      if (!userAddress) { return 0; }
      return nodeService.state.profile.userPostCountMap.get(userAddress) ?? 0;
    },
  }));
  const isPC = useWiderThan(960);
  const loadingTriggerBox = useRef<HTMLDivElement>(null);
  const nftBox = useRef<HTMLDivElement>(null);

  const handleOpenPost = (post: Post, locateComment: true | undefined = undefined) => {
    routerService.navigate({
      page: 'postdetail',
      id: post.id,
      locateComment,
    });
  };

  const handleUpdatePostCounter = (post: Post, type: Counter['type']) => {
    if (!nftService.hasPermissionAndTip('counter')) { return; }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.update(post, type),
    );
  };

  const loadPost = async () => {
    if (state.postLoading) { return; }
    const userAddress = state.profile?.userAddress;
    if (!userAddress) { return; }
    await runLoading(
      (l) => { state.postLoading = l; },
      async () => {
        const posts = await nodeService.post.getList({
          userAddress,
          viewer: keyService.state.address,
          limit: state.limit,
          offset: state.offset,
        });
        if (!posts) { return; }

        runInAction(() => {
          state.pauseAutoLoading = !posts;
          posts.forEach((v) => {
            state.posts.push(v);
          });
          state.offset += state.limit;
          state.postDone = posts.length < state.limit;
        });
      },
    );
  };

  const loadNFT = () => {
    const userAddress = state.profile?.userAddress;
    if (!userAddress) { return; }
    nftService.getNFT(userAddress);
  };

  const loadProfile = () => {
    runLoading(
      (l) => { state.profileLoading = l; },
      async () => {
        const userAddress = state.profile?.userAddress;
        if (!userAddress) { return; }
        await nodeService.profile.loadUserInfo(userAddress);
      },
    );
  };

  const loadData = () => {
    loadPost();
    loadNFT();
    loadProfile();
  };

  useEffect(() => {
    const dispose = reaction(
      () => state.profile?.name || state.profile?.userAddress.slice(0, 10),
      (name) => nodeService.group.setDocumentTitle(name),
      { fireImmediately: true },
    );
    if (!state.inited) {
      runInAction(() => {
        state.inited = true;
      });
      loadData();
    }

    const loadNextPage = async () => {
      if (state.postLoading || state.postDone) { return; }
      if (state.pauseAutoLoading) { return; }
      if (state.intersectionRatio > 0.1) {
        await loadPost();
        loadNextPage();
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      runInAction(() => {
        state.intersectionRatio = entry.intersectionRatio;
      });
      loadNextPage();
    }, {
      threshold: [0.1],
    });
    if (loadingTriggerBox.current) {
      io.observe(loadingTriggerBox.current);
    }

    return () => {
      dispose();
      io.disconnect();
    };
  }, []);

  if (!state.profile) { return null; }

  const nftCardBox = (
    <div
      className={classNames(
        'flex-col relative py-5 px-5 mt-6 rounded',
        state.selfProfile && 'bg-white shadow-4 text-black',
        !state.selfProfile && 'bg-black/80 text-white',
      )}
      ref={nftBox}
    >
      <div
        className={classNames(
          'text-center',
          state.selfProfile && 'text-dark-blue',
          !state.selfProfile && 'text-gray-9c',
        )}
      >
        {lang.profile.heldedNFTs(state.selfProfile)}
      </div>

      <div className="flex flex-center flex-wrap gap-4 mt-4">
        {state.nftLoading && (
          <div className="flex flex-center w-24 h-24">
            <CircularProgress className={classNames(state.selfProfile ? 'text-black/30' : 'text-white/70')} />
          </div>
        )}
        {!state.nftLoading && !state.nfts.length && (
          <NFTIcon
            size={96}
            color={state.selfProfile ? 'light' : 'dark'}
            lock
          />
        )}
        {!state.nftLoading && state.nfts.map((v) => (
          <NFTIcon
            key={v}
            size={96}
            color={state.selfProfile ? 'light' : 'dark'}
            tokenId={v}
            onClick={action(() => { state.ntfPopup = { open: true, nft: v }; })}
          />
        ))}
      </div>

      {state.selfProfile && (
        <div className="text-center mt-4">
          <ClickAwayListener onClickAway={action(() => { state.nftTradeTooltip = false; })}>
            <Tooltip
              PopperProps={{ disablePortal: true }}
              onClose={action(() => { state.nftTradeTooltip = false; })}
              open={state.nftTradeTooltip}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              title={lang.common.underDev}
            >
              <button
                className="text-link text-14"
                onClick={action(() => { state.nftTradeTooltip = true; })}
              >
                {lang.profile.nftTransfer}
              </button>
            </Tooltip>
          </ClickAwayListener>
        </div>
      )}
    </div>
  );

  return (<>
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div
        className={classNames(
          'relative flex-col',
          isPC && 'w-[800px]',
          !isPC && 'w-full',
        )}
      >
        {isPC && (<>
          <div className="flex justify-end w-full">
            <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
          </div>
          <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />
        </>)}
        <div
          className={classNames(
            'flex-col relative w-full mt-6',
            state.selfProfile && 'bg-white shadow-4 text-black',
            !state.selfProfile && 'bg-black/80 text-white',
          )}
        >
          {state.selfProfile && (
            <Button
              className="absolute right-3 top-2 px-2"
              color="link"
              variant="text"
              size="small"
              onClick={() => state.profile && editProfile({
                name: state.profile.name,
                avatar: state.profile.avatar,
                // intro: state.profile.intro,
              })}
            >
              <EditIcon className="text-18 -mt-px mr-1" />
              {lang.profile.editProfile}
            </Button>
          )}
          <div className="flex gap-x-4 p-5">
            <div className="mt-1">
              <UserAvatar
                profile={state.profile}
                size={48}
                onClick={() => state.profile?.avatar && imageZoomService.openImage(state.profile.avatar)}
              />
            </div>
            <div className="flex-col justify-center flex-1 gap-y-1">
              <div className="flex text-20 pr-30">
                <div className="flex-1 w-0 truncate">
                  {state.profile.name || state.profile.userAddress.slice(0, 10)}
                </div>
              </div>
              {/* {!!state.profile.intro && (
                <div className="text-14 text-gray-9c truncate-4">
                  {state.profile.intro}
                </div>
              )} */}
            </div>
            {!state.selfProfile && (
              <div className="flex flex-center flex-none">
                {false && (
                  <Button
                    className="rounded-full text-16 px-4 self-center"
                    variant="outlined"
                    color="rum"
                  >
                    <WineIcon className="text-20 mr-2 mb-px" />
                    给TA买一杯
                  </Button>
                )}
              </div>
            )}
          </div>
          <div
            className={classNames(
              'flex-col justify-center border-t mx-5 h-[48px]',
              state.selfProfile && 'border-black/25',
              !state.selfProfile && 'border-white/30',
            )}
          >
            <div
              className={classNames(
                'text-14',
                isPC && 'ml-16',
                !isPC && 'ml-0',
              )}
            >
              {!!state.fistPostTime && lang.profile.joinAt(format(state.fistPostTime, 'yyyy-MM'))}
              {!!state.fistPostTime && ' · '}
              {lang.profile.postCount(state.totalPosts)}
            </div>
          </div>
        </div>

        <div
          className={classNames(
            'bg-black/80 flex-col flex-1 gap-y-12 mt-6',
            isPC && 'w-[800px] py-10 px-16',
            !isPC && 'py-3 px-4',
          )}
        >
          {state.profileLoading && (
            <div className="flex flex-center py-4">
              <CircularProgress className="text-white/70" />
            </div>
          )}
          {!state.profileLoading && (<>
            {!state.posts.length && !state.postLoading && (
              <div className="flex flex-center text-white/70 text-14">
                {lang.profile.noPostYet}
              </div>
            )}
            {state.posts.map((v) => {
              const stat = nodeService.post.getStat(v);
              return (
                <div key={v.id}>
                  <div
                    className="flex-col"
                    onClick={() => handleOpenPost(v)}
                  >
                    <Link
                      className="text-white text-16 font-medium cursor-pointer leading-relaxed truncate-2 hover:underline"
                      to={routerService.getPath({ page: 'postdetail', id: v.id })}
                      onClick={(e) => e.preventDefault()}
                    >
                      {stat.title || lang.common.untitled}
                    </Link>
                    <div className="text-blue-gray text-14 truncate-2 mt-2">
                      {RemoveMarkdown(stat.content.replaceAll(/!\[.*?\]\(.+?\)/g, lang.common.imagePlaceholder))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-link-soft text-14">
                    <div
                      className={classNames(
                        'flex -ml-2',
                        isPC && 'gap-x-6',
                        !isPC && 'gap-x-5',
                      )}
                    >
                      <Button
                        className={classNames(
                          'text-14 min-w-0 px-2 normal-case',
                          !stat.liked && 'text-link-soft',
                          stat.liked && 'text-rum-orange',
                        )}
                        variant="text"
                        size="small"
                        onClick={() => handleUpdatePostCounter(v, stat.liked ? 'undolike' : 'like')}
                      >
                        {!stat.likeCount && (
                          <ThumbUpOffAlt className="mr-2 text-18" />
                        )}
                        {!!stat.likeCount && (
                          <ThumbUpAlt className="mr-2 text-18" />
                        )}
                        {stat.likeCount || lang.common.like}
                      </Button>
                      <Button
                        className={classNames(
                          'text-14 min-w-0 px-2 normal-case',
                          !stat.disliked && 'text-link-soft',
                          stat.disliked && 'text-rum-orange',
                        )}
                        variant="text"
                        size="small"
                        onClick={() => handleUpdatePostCounter(v, stat.disliked ? 'undodislike' : 'dislike')}
                      >
                        {!stat.dislikeCount && (
                          <ThumbDownOffAlt className="mr-2 text-18" />
                        )}
                        {!!stat.dislikeCount && (
                          <ThumbDownAlt className="mr-2 text-18" />
                        )}
                        {stat.dislikeCount || lang.common.dislike}
                      </Button>
                      <Button
                        className="text-link-soft text-14 px-2 min-w-0s"
                        variant="text"
                        size="small"
                        onClick={() => handleOpenPost(v, true)}
                      >
                        <CommentDetailIcon className="mr-2 -mb-px text-18" />
                        {v.commentCount || (isPC ? lang.comment.writeAComment : lang.comment.comment)}
                      </Button>
                    </div>
                    <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                      <div className="text-12">
                        {ago(v.timestamp)}
                      </div>
                    </Tooltip>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-center h-12">
              {state.postLoading && (
                <CircularProgress className="text-white/70" />
              )}
              {!state.postLoading && !state.postDone && (
                <Button
                  className="flex-1 text-link-soft py-2"
                  variant="text"
                  onClick={() => loadPost()}
                >
                  {lang.common.loadMore}
                  <ExpandMore />
                </Button>
              )}
              {state.postDone && state.posts.length > 10 && (
                <span className="text-white/60 text-14">
                  {lang.common.noMore}
                </span>
              )}
            </div>
          </>)}
        </div>

        <div
          className="absolute h-[400px] w-0 bottom-20 pointer-events-none"
          ref={loadingTriggerBox}
        />
      </div>

      {isPC && (
        <div className="w-[280px]">
          <div
            className="fixed flex-col w-[280px]"
            style={{ maxHeight: 'calc(100vh - 64px)' }}
          >
            <Scrollable className="flex-1 h-0" hideTrack>
              {!nodeService.state.config.currentGroup.nft && (
                <UserCard
                  className="mt-6"
                  profile={state.profile}
                  disableClickAction
                />
              )}
              {!!nodeService.state.config.currentGroup.nft && nftCardBox}
              {state.selfProfile && (
                <PortList className="mt-6" />
              )}
              <div className="h-[100px] w-full" />
            </Scrollable>
          </div>
        </div>
      )}
    </div>

    <ThemeLight>
      <Popover
        className="mt-6"
        open={state.ntfPopup.open}
        anchorEl={nftBox.current}
        onClose={action(() => { state.ntfPopup.open = false; })}
        transformOrigin={{
          horizontal: 'center',
          vertical: 'top',
        }}
        anchorOrigin={{
          horizontal: 'center',
          vertical: 'bottom',
        }}
        disableScrollLock
      >
        <div className="flex-col items-center relative w-[280px]">
          <IconButton
            className="absolute top-1 right-1"
            size="small"
            onClick={action(() => { state.ntfPopup.open = false; })}
          >
            <Close className="text-link text-20" />
          </IconButton>

          {state.ntfPopup.nft !== null && (<>
            <div className="flex-col gap-y-4 mt-6">
              <NFTIcon
                key={state.ntfPopup.nft}
                size={96}
                color={state.selfProfile ? 'light' : 'dark'}
                tokenId={state.ntfPopup.nft}
              />
            </div>

            <div className="text-gray-9c text-center text-12 mt-4 w-52 leading-relaxed">
              <div className="flex justify-between">
                <div>Contract Address</div>
                <Tooltip title={state.contractAddress} disableInteractive>
                  <a
                    href={`https://explorer.rumsystem.net/token/${state.contractAddress}/`}
                    target="_blank"
                    rel="noopenner"
                  >
                    {state.contractAddress.slice(0, 6)}...{state.contractAddress.slice(-4)}
                  </a>
                </Tooltip>
              </div>
              <div className="flex justify-between">
                <div>Token ID</div>
                <a
                  href={`https://explorer.rumsystem.net/token/${state.contractAddress}/instance/${state.ntfPopup.nft}`}
                  target="_blank"
                  rel="noopenner"
                >
                  {state.ntfPopup.nft}
                </a>
              </div>
              <div className="flex justify-between">
                <div>Token Standard</div>
                <div>ERC-721</div>
              </div>
              <div className="flex justify-between">
                <div>Blockchain</div>
                <div>rum-eth</div>
              </div>
              {/* <div className="flex justify-between">
                  <div>Creator Fees</div>
                  <div>5%</div>
                </div> */}
            </div>
          </>)}

          <div className="border-t self-stretch mx-5 mt-4" />
        </div>
      </Popover>
    </ThemeLight>
  </>);
});
