import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import RemoveMarkdown from 'remove-markdown';
import type { Post } from 'nft-bbs-server';
import { ExpandMore, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import { Button, CircularProgress, Fab, Tooltip } from '@mui/material';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';

import { ScrollToTopButton, GroupCard, NFTSideBox, UserAvatar } from '~/components';
import { keyService, nftService, nodeService, routerService } from '~/service';
import { ago, notNullFilter, runLoading, usePageState, useWiderThan } from '~/utils';
import { showTrxDetail } from '~/modals';

export const createPostlistState = () => ({
  inited: false,
  trxIds: [] as Array<string>,
  limit: 20 as const,
  offset: 0,
  done: false,
  loading: false,

  header: {
    tab: 0,
    searchTerm: '',
    searchMode: false,
  },
  mode: {
    type: 'normal' as 'normal' | 'search' | 'hot',
    hot: 'all' as 'week' | 'month' | 'year' | 'all',
    search: '',
  },

  ntfPopup: false,

  likeLoadingMap: new Map<string, boolean>(),
  intersectionRatio: 0,
  pauseAutoLoading: false,
  get nfts() {
    const list = Array(4).fill(0).map((_, i) => i);
    return Array(Math.ceil(list.length / 2)).fill(0).map((_, i) => list.slice(i * 2, i * 2 + 2));
  },
  get posts() {
    return this.trxIds
      .map((v) => nodeService.state.post.map.get(v))
      .filter(notNullFilter);
  },
  async loadPosts(nextPage = false) {
    if (this.loading) { return; }
    if (!nextPage) {
      runInAction(() => {
        this.trxIds = [];
        this.offset = 0;
        this.done = false;
      });
    }
    await runLoading(
      (l) => { this.loading = l; },
      async () => {
        const posts = await nodeService.post.getList({
          limit: this.limit,
          offset: this.offset,
          viewer: keyService.state.address,
          search: this.mode.type === 'search' ? this.mode.search : undefined,
          hot: this.mode.type === 'hot' ? this.mode.hot : undefined,
        });

        if (!posts) { return; }

        runInAction(() => {
          this.pauseAutoLoading = !posts;
          posts.forEach((v) => {
            if (!this.trxIds.includes(v.trxId)) {
              this.trxIds.push(v.trxId);
            }
          });
          if (this.offset === 0 && this.mode.type === 'normal' && nodeService.state.post.newPostCache.size) {
            nodeService.state.post.newPostCache.forEach((v) => {
              this.trxIds.unshift(v);
            });
          }
          this.offset += this.limit;
          this.done = posts.length < this.limit;
        });
      },
    );
  },
});

export const PostList = observer((props: { className?: string }) => {
  const routeLocation = useLocation();
  const state = usePageState('postlist', routeLocation.key, createPostlistState);
  const isPC = useWiderThan(960);

  const loadingTriggerBox = useRef<HTMLDivElement>(null);

  const handleOpenPost = (post: Post, locateComment: true | undefined = undefined) => {
    routerService.navigate({
      page: 'postdetail',
      trxId: post.trxId,
      locateComment,
    });
  };

  const handleUpdatePostCounter = (post: Post, type: 'Like' | 'Dislike') => {
    if (!nftService.hasPermissionAndTip('counter')) { return; }
    if (state.likeLoadingMap.get(post.trxId)) { return; }
    runLoading(
      (l) => { state.likeLoadingMap.set(post.trxId, l); },
      () => nodeService.counter.updatePost(post, type),
    );
  };

  useEffect(() => {
    nodeService.group.setDocumentTitle();
    if (!state.inited) {
      state.loadPosts();
      runInAction(() => {
        state.inited = true;
      });
    }

    const loadNextPage = async () => {
      if (state.loading || state.done) { return; }
      if (state.intersectionRatio < 0.1) { return; }
      if (state.pauseAutoLoading) { return; }
      await state.loadPosts(true);
      loadNextPage();
    };

    const io = new IntersectionObserver(([entry]) => {
      runInAction(() => {
        state.intersectionRatio = entry.intersectionRatio;
      });
      loadNextPage();
    }, { threshold: [0.1] });

    if (loadingTriggerBox.current) {
      io.observe(loadingTriggerBox.current);
    }
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="w-[800px] bg-black/80 flex-col">
        {isPC && (
          <div className="flex justify-end">
            <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
          </div>
        )}
        {!isPC && nftService.state.permissionMap.main && (
          <Fab
            className="fixed bottom-8 right-6"
            color="rum"
            onClick={() => routerService.navigate({ page: 'newpost' })}
          >
            <EditIcon className="text-30 text-white" />
          </Fab>
        )}
        <div
          className={classNames(
            'flex-col',
            isPC && 'py-7 px-13 gap-y-6',
            !isPC && 'py-3 px-4 gap-y-10 pt-6',
          )}
        >
          {state.posts.map((v) => {
            const stat = nodeService.post.getStat(v);
            const profile = nodeService.profile.getComputedProfile(v.extra?.userProfile || v.userAddress);
            const authorAvatarAndName = (
              <button
                className="flex flex-center flex-none text-white/50 text-14 max-w-[200px]"
                onClick={(e) => {
                  e.stopPropagation();
                  if (profile) {
                    routerService.navigate({
                      page: 'userprofile',
                      userAddress: profile.userAddress,
                    });
                  }
                }}
              >
                <UserAvatar className="mr-[10px] flex-none" profile={profile} size={isPC ? 24 : 28} />
                <div className="truncate">
                  {profile.name || profile.userAddress.slice(0, 10)}
                </div>
              </button>
            );
            const statusAndTime = (
              <div className="flex flex-center gap-x-4">
                <button
                  className="text-link-soft/50 text-12"
                  onClick={() => !nodeService.state.post.newPostCache.has(v.trxId) && showTrxDetail(v.trxId, 'main')}
                >
                  {nodeService.state.post.newPostCache.has(v.trxId) ? '同步中' : '已同步'}
                </button>
                <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                  <div className="text-12 text-link-soft">
                    {ago(v.timestamp)}
                  </div>
                </Tooltip>
              </div>
            );
            return (
              <div
                className="p-3 flex-col items-start bg-transparent normal-case rounded-none gap-y-2 cursor-auto select-auto"
                key={v.trxId}
              >
                {!isPC && (
                  <div className="flex justify-between items-center">
                    {authorAvatarAndName}
                    {statusAndTime}
                  </div>
                )}
                <div
                  className="flex-col self-stretch gap-y-2"
                  onClick={() => handleOpenPost(v)}
                >
                  <div className="flex justify-between items-center self-stretch gap-x-2">
                    <Link
                      className="text-white text-18 font-medium leading-relaxed truncate-2 hover:underline"
                      to={routerService.getPath({ page: 'postdetail', trxId: v.trxId })}
                      onClick={(e) => { e.preventDefault(); }}
                    >
                      {stat.title || '无标题'}
                    </Link>
                    {isPC && authorAvatarAndName}
                  </div>

                  <div
                    className={classNames(
                      'text-blue-gray text-14 break-all',
                      isPC && 'truncate-2',
                      !isPC && 'truncate-4',
                    )}
                  >
                    {RemoveMarkdown(stat.content.replaceAll(/!\[.*?\]\(.+?\)/g, '[图片]'))}
                  </div>
                </div>


                <div className="flex items-center justify-between self-stretch mt-1 text-14">
                  <div className="flex gap-x-6 -ml-2">
                    <Button
                      className={classNames(
                        'text-14 px-2 min-w-0',
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
                        'text-14 px-2 min-w-0',
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
                      {stat.commentCount || (isPC ? '我来写第一个评论' : '评论')}
                    </Button>
                  </div>
                  {isPC && statusAndTime}
                </div>
              </div>
            );
          })}

          <div className="relative flex flex-center h-12">
            <div
              className="absolute h-[400px] w-0 bottom-0 pointer-events-none"
              ref={loadingTriggerBox}
            />
            {state.loading && (
              <CircularProgress className="text-white/70" />
            )}
            {!state.loading && !state.done && (
              <Button
                className="flex-1 text-link-soft py-2"
                variant="text"
                onClick={() => state.loadPosts(true)}
              >
                加载更多
                <ExpandMore />
              </Button>
            )}
            {state.done && (
              <span className="text-white/60 text-14">
                {!state.trxIds.length && state.mode.type !== 'search' && '暂无帖子'}
                {state.trxIds.length > 10 && state.mode.type !== 'search' && '没有啦'}
                {!state.trxIds.length && state.mode.type === 'search' && '没有找到搜索结果'}
              </span>
            )}
          </div>
        </div>
      </div>

      {isPC && (
        <div className="w-[280px]">
          <div className="fixed w-[280px]">
            <GroupCard className="mt-16" showNewPost />
            <NFTSideBox />
          </div>
        </div>
      )}
    </div>
  );
});
