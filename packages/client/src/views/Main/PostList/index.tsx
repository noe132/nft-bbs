import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { stringifyUrl } from 'query-string';
import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { format } from 'date-fns';
import RemoveMarkdown from 'remove-markdown';
import type { Post } from 'nft-bbs-server';
import { CounterName } from 'nft-bbs-types';
import { ExpandMore, Refresh, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';

import { ScrollToTopButton, GroupSideBox, NFTSideBox, UserAvatar } from '~/components';
import { keyService, nodeService, snackbarService } from '~/service';
import { ago, notNullFilter, runLoading, usePageState } from '~/utils';
import { showTrxDetail } from '~/modals';

export const createPostlistState = () => ({
  inited: false,
  trxIds: [] as Array<string>,
  limit: 20 as const,
  offset: 0,
  done: false,
  loading: false,
  mode: { type: 'normal' } as { type: 'normal' } | { type: 'search', search: string },

  ntfPopup: false,
  likeLoadingMap: new Map<string, boolean>(),
  intersectionRatio: 0,
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
        });

        if (!posts) { return; }

        runInAction(() => {
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
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const state = usePageState('postlist', routeLocation.key, createPostlistState);

  const loadingTriggerBox = useRef<HTMLDivElement>(null);

  const handleOpenPost = (post: Post, locateComment: true | undefined = undefined) => {
    const url = stringifyUrl({
      url: `/post/${post.groupId}/${post.trxId}`,
      query: { locateComment },
    });
    navigate(url);
  };

  const handleUpdatePostCounter = (post: Post, type: CounterName.postLike | CounterName.postDislike) => {
    if (nodeService.state.postPermissionTip) {
      snackbarService.show(nodeService.state.postPermissionTip);
      return;
    }
    if (state.likeLoadingMap.get(post.trxId)) { return; }
    runLoading(
      (l) => { state.likeLoadingMap.set(post.trxId, l); },
      () => nodeService.counter.update({
        type: 'post',
        item: post,
        counterName: type,
      }),
    );
  };

  useEffect(() => {
    if (!state.inited) {
      state.loadPosts();
      runInAction(() => {
        state.inited = true;
      });
    }

    const loadNextPage = async () => {
      if (state.loading || state.done) { return; }
      if (state.intersectionRatio < 0.1) { return; }
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
        <div className="flex justify-end">
          <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
        </div>
        <div className="flex-col gap-y-12 py-10 px-16">
          <div className="flex flex-center -my-4 -mb-8">
            {!!state.trxIds.length && (
              <LoadingButton
                className="w-full text-white/70"
                variant="text"
                onClick={() => state.loadPosts()}
                loading={state.loading}
              >
                刷新 <Refresh className="text-20 -mt-px" />
              </LoadingButton>
            )}
          </div>

          {state.posts.map((v) => {
            const stat = nodeService.post.getStat(v);
            const profile = nodeService.profile.getComputedProfile(v.extra?.userProfile || v.userAddress);
            return (
              <div key={v.trxId}>
                <div className="flex justify-between items-center gap-x-2">
                  <Link
                    className="text-white text-18 font-medium cursor-pointer leading-relaxed truncate-2 hover:underline"
                    to={`/post/${v.groupId}/${v.trxId}`}
                    onClick={(e) => { e.preventDefault(); handleOpenPost(v); }}
                  >
                    {stat.title || '无标题'}
                  </Link>
                  <button
                    className="flex flex-center flex-none text-white/50 text-14 max-w-[200px]"
                    onClick={() => profile && navigate(`/userprofile/${profile.groupId}/${profile.userAddress}`)}
                  >
                    <UserAvatar className="mr-2 flex-none" profile={profile} size={24} />
                    <div className="truncate">
                      {profile.name || profile.userAddress.slice(0, 10)}
                    </div>
                  </button>
                </div>
                <div className="text-blue-gray text-14 truncate-2 mt-2">
                  {RemoveMarkdown(stat.content.replaceAll(/!\[.*?\]\(.+?\)/g, '[图片]'))}
                </div>
                <div className="flex items-center justify-between mt-3 text-14">
                  <div className="flex gap-x-2 -ml-2">
                    <div className="min-w-[72px]">
                      <Button
                        className={classNames(
                          'text-14 px-2 min-w-0',
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
                    </div>
                    <div className="min-w-[72px]">
                      <Button
                        className={classNames(
                          'text-14 px-2 min-w-0',
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
                    </div>
                    <div className="min-w-[72px]">
                      <Button
                        className="text-link-soft text-14 px-2 min-w-0"
                        variant="text"
                        size="small"
                        onClick={() => handleOpenPost(v, true)}
                      >
                        <CommentDetailIcon className="mr-2 -mb-px text-18" />
                        {stat.commentCount || '我来写第一个评论'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-center gap-x-4">
                    <button
                      className="text-link-soft/50 text-12"
                      onClick={() => v.storage === 'chain' && showTrxDetail(v.trxId)}
                    >
                      {v.storage === 'cache' ? '同步中' : '已同步'}
                    </button>
                    <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                      <div className="text-12 text-link-soft">
                        {ago(v.timestamp)}
                      </div>
                    </Tooltip>
                  </div>
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
                {state.trxIds.length > 10 && state.mode.type !== 'search' && '没有啦'}
                {!state.trxIds.length && state.mode.type === 'search' && '没有找到搜索结果'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="w-[280px]">
        <div className="fixed w-[280px]">
          <GroupSideBox className="mt-16" showNewPost />
          {false && <NFTSideBox className="mt-8" />}
        </div>
      </div>
    </div>
  );
});
