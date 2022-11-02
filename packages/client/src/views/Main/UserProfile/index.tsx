import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { stringifyUrl } from 'query-string';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import RemoveMarkdown from 'remove-markdown';
import { format } from 'date-fns';
import type { Post } from 'nft-bbs-server';
import { Button, CircularProgress, ClickAwayListener, IconButton, Popover, Tooltip } from '@mui/material';
import { Close, ExpandMore, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { ScrollToTopButton, BackButton, UserAvatar, UserCard, NFTIcon } from '~/components';
import { imageZoomService, keyService, nftService, nodeService } from '~/service';
import { ago, runLoading, ThemeLight, usePageState } from '~/utils';
import { editProfile } from '~/modals';

export const UserProfile = observer((props: { className?: string }) => {
  const routeParams = useParams<{ groupId: string, userAddress: string }>();
  const routeLocation = useLocation();
  const navigate = useNavigate();
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
  const loadingTriggerBox = useRef<HTMLDivElement>(null);
  const nftBox = useRef<HTMLDivElement>(null);

  const handleOpenPost = (post: Post, locateComment: true | undefined = undefined) => {
    navigate(stringifyUrl({
      url: `/${post.groupId}/post/${post.trxId}`,
      query: { locateComment },
    }));
  };

  const handleUpdatePostCounter = (post: Post, type: 'Like' | 'Dislike') => {
    if (!nftService.hasPermissionAndTip('counter')) { return; }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.updatePost(post, type),
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
  return (<>
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="relative flex-col w-[800px]">
        <div className="flex justify-end w-full">
          <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
        </div>
        <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />
        <div
          className={classNames(
            'flex-col relative w-full mt-6 ',
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
              修改身份资料
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
            <div className="ml-16 text-14">
              {!!state.fistPostTime && `加入于 ${format(state.fistPostTime, 'yyyy-MM')}`}
              {!!state.fistPostTime && ' · '}
              共发表 {state.totalPosts} 帖
            </div>
          </div>
        </div>

        <div className="w-[800px] bg-black/80 flex-col flex-1 gap-y-12 py-10 px-16 mt-6">
          {state.profileLoading && (
            <div className="flex flex-center py-4">
              <CircularProgress className="text-white/70" />
            </div>
          )}
          {!state.profileLoading && (<>
            {!state.posts.length && !state.postLoading && (
              <div className="flex flex-center text-white/70 text-14">
                Ta还没有发布过帖子
              </div>
            )}
            {state.posts.map((v) => {
              const stat = nodeService.post.getStat(v);
              return (
                <div key={v.trxId}>
                  <a
                    className="text-white text-16 font-medium cursor-pointer leading-relaxed truncate-2 hover:underline"
                    href={`/post/${v.groupId}/${v.trxId}`}
                    onClick={(e) => { e.preventDefault(); handleOpenPost(v); }}
                  >
                    {stat.title || '无标题'}
                  </a>
                  <div className="text-blue-gray text-14 truncate-2 mt-2">
                    {RemoveMarkdown(stat.content)}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-link-soft text-14">
                    <div className="flex gap-x-6 -ml-2">
                      <Button
                        className={classNames(
                          'text-14 min-w-0 px-2',
                          !stat.liked && 'text-link-soft',
                          stat.liked && 'text-rum-orange',
                        )}
                        variant="text"
                        size="small"
                        onClick={() => handleUpdatePostCounter(v, 'Like')}
                      >
                        {!stat.likeCount && (
                          <ThumbUpOffAlt className="mr-2 text-18" />
                        )}
                        {!!stat.likeCount && (
                          <ThumbUpAlt className="mr-2 text-18" />
                        )}
                        {stat.likeCount || '赞'}
                      </Button>
                      <Button
                        className={classNames(
                          'text-14 min-w-0 px-2',
                          !stat.disliked && 'text-link-soft',
                          stat.disliked && 'text-rum-orange',
                        )}
                        variant="text"
                        size="small"
                        onClick={() => handleUpdatePostCounter(v, 'Dislike')}
                      >
                        {!stat.dislikeCount && (
                          <ThumbDownOffAlt className="mr-2 text-18" />
                        )}
                        {!!stat.dislikeCount && (
                          <ThumbDownAlt className="mr-2 text-18" />
                        )}
                        {stat.dislikeCount || '踩'}
                      </Button>
                      <Button
                        className="text-link-soft text-14 px-2 min-w-0"
                        variant="text"
                        size="small"
                        onClick={() => handleOpenPost(v, true)}
                      >
                        <CommentDetailIcon className="mr-2 -mb-px text-18" />
                        {v.commentCount || '我来写第一个评论'}
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
                  加载更多
                  <ExpandMore />
                </Button>
              )}
              {state.postDone && state.posts.length > 10 && (
                <span className="text-white/60 text-14">
                  没有啦
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

      <div className="w-[280px]">
        {!nodeService.state.config.currentGroup.nft && (
          <UserCard
            className="mt-6"
            profile={state.profile}
            disableClickAction
          />
        )}
        {!!nodeService.state.config.currentGroup.nft && (
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
              {state.selfProfile ? '我' : 'Ta'}
              持有的 NFT
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
                    title="功能开发中"
                  >
                    <button
                      className="text-link text-14"
                      onClick={action(() => { state.nftTradeTooltip = true; })}
                    >
                      NFT 交易或转让
                    </button>
                  </Tooltip>
                </ClickAwayListener>
              </div>
            )}
          </div>
        )}
      </div>
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
