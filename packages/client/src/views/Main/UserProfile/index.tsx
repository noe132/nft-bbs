import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import RemoveMarkdown from 'remove-markdown';
import { format } from 'date-fns';
import type { Post } from 'nft-bbs-server';
import { CounterName } from 'nft-bbs-types';
import { Button, CircularProgress, ClickAwayListener, Tooltip } from '@mui/material';
import { ExpandMore, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { ScrollToTopButton, BackButton, UserAvatar } from '~/components';
import { imageZoomService, keyService, nodeService, snackbarService, viewService } from '~/service';
import { ago, runLoading } from '~/utils';
import { editProfile } from '~/modals';

export const UserProfile = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    content: '',
    showTopButton: false,
    nftTradeTooltip: false,
    likeLoading: false,
    profileLoading: true,

    posts: [] as Array<Post>,
    offset: 0,
    limit: 20 as const,
    postLoading: false,
    postDone: false,

    intersectionRatio: 0,

    get nfts() {
      const list = Array(4).fill(0).map((_, i) => i);
      return Array(Math.ceil(list.length / 2)).fill(0).map((_, i) => list.slice(i * 2, i * 2 + 2));
    },
    get viewProfile() {
      if (viewService.state.page.page.name === 'userprofile') {
        return viewService.state.page.page.value;
      }
      return null;
    },
    get profile() {
      if (this.viewProfile) {
        return nodeService.profile.getComputedProfile(this.viewProfile);
      }
      return null;
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

  const handleOpenPost = (post: Post) => {
    viewService.pushPage({
      name: 'postdetail',
      value: {
        post,
        groupId: post.groupId,
        trxId: post.trxId,
      },
    });
  };

  const handleUpdatePostCounter = (post: Post, type: CounterName) => {
    if (!nodeService.state.logined) {
      snackbarService.show('请先登录');
      return;
    }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.update({
        type: 'post',
        item: post,
        counterName: type,
      }),
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

        runInAction(() => {
          posts.forEach((v) => {
            state.posts.push(v);
          });
          state.offset += state.limit;
          state.postDone = posts.length < state.limit;
        });
      },
    );
  };

  const loadData = async () => {
    loadPost();
    await runLoading(
      (l) => { state.profileLoading = l; },
      async () => {
        const userAddress = state.profile?.userAddress;
        if (!userAddress) { return; }
        await nodeService.profile.loadUserInfo(userAddress);
      },
    );
  };

  useEffect(() => {
    const loadNextPage = async () => {
      if (state.postLoading || state.postDone) {
        return;
      }
      if (state.intersectionRatio > 0.1) {
        await loadPost();
        loadNextPage();
      }
    };

    loadData();

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
      io.disconnect();
    };
  }, []);

  if (!state.profile) { return null; }
  return (
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
                intro: state.profile.intro,
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
              {!!state.profile.intro && (
                <div className="text-14 text-gray-9c truncate-2">
                  {state.profile.intro}
                </div>
              )}
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
              const stat = nodeService.post.getPostStat(v);
              return (
                <div key={v.trxId}>
                  <div
                    className="text-white text-16 font-medium cursor-pointer leading-relaxed truncate-2 hover:underline"
                    onClick={() => handleOpenPost(v)}
                  >
                    {stat.title || '无标题'}
                  </div>
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
                        onClick={() => handleUpdatePostCounter(v, CounterName.postLike)}
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
                        onClick={() => handleUpdatePostCounter(v, CounterName.postDislike)}
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
                        onClick={() => handleOpenPost(v)}
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
        <div
          className={classNames(
            'flex-col relative py-5 px-5 mt-6 rounded',
            state.selfProfile && 'bg-white shadow-4 text-black',
            !state.selfProfile && 'bg-black/80 text-white',
          )}
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
          <div className="text-center mt-4 text-12">
            功能开发中
          </div>
          {/* <div className="flex-col gap-y-4 mt-4">
            {state.nfts.map((row, i) => (
              <div
                className="flex gap-x-4 flex-center"
                key={i}
              >
                {row.map((_, j) => (
                  <div
                    className="flex w-22 h-22 p-1 border border-white/70"
                    key={j}
                  >
                    <div className="flex-1 self-stretch bg-white/80" />
                  </div>
                ))}
              </div>
            ))}
          </div> */}
          {false && state.selfProfile && (
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
      </div>
    </div>
  );
});
