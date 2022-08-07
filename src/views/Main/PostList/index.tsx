import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import RemoveMarkdown from 'remove-markdown';
import { ExpandMore, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import { Button, CircularProgress, IconButton, Popover, Tooltip } from '@mui/material';

import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';
import LockIcon from 'boxicons/svg/regular/bx-lock-alt.svg?fill-icon';
import ExpandIcon from 'boxicons/svg/regular/bx-expand-alt.svg?fill-icon';
import CollapseIcon from 'boxicons/svg/regular/bx-collapse-alt.svg?fill-icon';
import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';

import { ScrollToTopButton } from '~/components';
import { viewService, nodeService, snackbarService } from '~/service';
import { ago, runLoading, ThemeLight } from '~/utils';
import { CounterName, IPost, TrxStorage } from '~/database';

export const PostList = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    ntfPopup: false,
    likeLoadingMap: new Map<string, boolean>(),
    get nfts() {
      const list = Array(4).fill(0).map((_, i) => i);
      return Array(Math.ceil(list.length / 2)).fill(0).map((_, i) => list.slice(i * 2, i * 2 + 2));
    },
  }));

  const nftSmallIconBox = useRef<HTMLDivElement>(null);

  const handleOpenPost = (post: IPost) => {
    viewService.pushPage('postdetail', post);
  };

  const handleUpdatePostCounter = (post: IPost, type: CounterName) => {
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

  const handleNewPost = () => {
    if (!nodeService.state.logined) {
      snackbarService.show('请先登录');
      return;
    }
    viewService.pushPage('newpost');
  };

  useEffect(() => {
    if (!nodeService.state.post.trxIds.length && !nodeService.state.post.loading) {
      nodeService.post.load();
    }
  }, []);

  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="w-[800px] bg-black/70 flex-col">
        <div className="flex justify-end">
          <ScrollToTopButton className="fixed bottom-8 translate-x-full -mr-8" />
        </div>
        <div className="flex-col gap-y-12 py-10 px-16">
          {nodeService.state.post.posts.map((v) => (
            <div key={v.trxId}>
              <div
                className="text-white text-18 font-medium cursor-pointer leading-relaxed truncate-2 hover:underline"
                onClick={() => handleOpenPost(v)}
              >
                {v.title || '无标题'}
              </div>
              <div className="text-blue-gray text-14 truncate-2 mt-2">
                {RemoveMarkdown(v.content.replaceAll(/!\[.*?\]\(.+?\)/g, '[图片]'))}
              </div>
              <div className="flex items-center justify-between mt-3 text-14">
                <div className="flex gap-x-2 -ml-2">
                  <div className="min-w-[72px]">
                    <Button
                      className={classNames(
                        'text-14 px-2 min-w-0',
                        !v.extra?.liked && 'text-link-soft',
                        v.extra?.liked && 'text-rum-orange',
                      )}
                      variant="text"
                      size="small"
                      onClick={() => handleUpdatePostCounter(v, CounterName.postLike)}
                    >
                      {!v.summary.likeCount && (
                        <ThumbUpOffAlt className="mr-2 text-18" />
                      )}
                      {!!v.summary.likeCount && (
                        <ThumbUpAlt className="mr-2 text-18" />
                      )}
                      {v.summary.likeCount || '点赞'}
                    </Button>
                  </div>
                  <div className="min-w-[72px]">
                    <Button
                      className={classNames(
                        'text-14 px-2 min-w-0',
                        !v.extra?.disliked && 'text-link-soft',
                        v.extra?.disliked && 'text-rum-orange',
                      )}
                      variant="text"
                      size="small"
                      onClick={() => handleUpdatePostCounter(v, CounterName.postDislike)}
                    >
                      {!v.summary.dislikeCount && (
                        <ThumbDownOffAlt className="mr-2 text-18" />
                      )}
                      {!!v.summary.dislikeCount && (
                        <ThumbDownAlt className="mr-2 text-18" />
                      )}
                      {v.summary.dislikeCount || '点踩'}
                    </Button>
                  </div>
                  <div className="min-w-[72px]">
                    <Button
                      className="text-link-soft text-14 px-2 min-w-0"
                      variant="text"
                      size="small"
                      onClick={() => handleOpenPost(v)}
                    >
                      <CommentDetailIcon className="mr-2 -mb-px text-18" />
                      {v.summary.commentCount || '我来写第一个评论'}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-center gap-x-4">
                  <div className="text-link-soft text-12 opacity-50">
                    {v.storage === TrxStorage.cache ? '同步中' : '已同步'}
                  </div>
                  <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                    <div className="text-12 text-link-soft">
                      {ago(v.timestamp)}
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-center h-12">
            {nodeService.state.post.loading && (
              <CircularProgress className="text-white/70" />
            )}
            {!nodeService.state.post.loading && !nodeService.state.post.done && (
              <Button
                className="flex-1 text-link-soft py-2"
                variant="text"
                onClick={() => snackbarService.show('TODO')}
              >
                load more
                <ExpandMore />
              </Button>
            )}
            {nodeService.state.post.done && (
              <span className="text-white/60 text-14">
                没有啦
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="w-[280px]">
        <div className="flex-col gap-y-9 flex-center relative bg-black/70 h-[240px] pt-16 mt-16">
          <div className="w-25 h-25 rounded-full overflow-hidden bg-white absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
            <div className="bg-blue-400/70 rounded-full h-full w-full" />
          </div>
          <div className="text-white text-center text-18">
            {nodeService.state.groupName}
          </div>
          <Tooltip title={!nodeService.state.logined ? '请先登录' : ''}>
            <Button
              className="rounded-full text-16 px-5 py-[7px]"
              variant="outlined"
              color={[].length ? 'dark-blue' : 'rum'}
              onClick={handleNewPost}
            >
              <EditIcon className="text-22 mr-3 mb-px" />
              发布新帖
            </Button>
          </Tooltip>
        </div>

        <div
          className="flex-col flex-center relative mt-8"
          ref={nftSmallIconBox}
        >
          <div className="flex gap-x-5">
            <Tooltip title={<ExpandIcon className="text-20 -mx-1" />}>
              <button
                className="flex items-stretch w-9 h-9 p-1 border border-white/80"
                onClick={action(() => { state.ntfPopup = true; })}
              >
                <div className="flex flex-center flex-1 bg-white" />
              </button>
            </Tooltip>
            <Tooltip title={<ExpandIcon className="text-20 -mx-1" />}>
              <button
                className="flex items-stretch w-9 h-9 p-1 border border-white/80"
                onClick={action(() => { state.ntfPopup = true; })}
              >
                <div className="flex flex-center flex-1 bg-white/20">
                  <LockIcon className="text-white text-18" />
                </div>
              </button>
            </Tooltip>
          </div>
        </div>

        <ThemeLight>
          <Popover
            className="mt-6"
            open={state.ntfPopup}
            anchorEl={nftSmallIconBox.current}
            onClose={action(() => { state.ntfPopup = false; })}
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
                onClick={action(() => { state.ntfPopup = false; })}
              >
                <CollapseIcon className="text-link text-20" />
              </IconButton>

              <div className="flex-col gap-y-4 mt-8">
                {state.nfts.map((row, i) => (
                  <div
                    className="flex gap-x-4 flex-center"
                    key={i}
                  >
                    {row.map((_, j) => (
                      <div
                        className="flex w-22 h-22 p-1 border border-black/15"
                        key={j}
                      >
                        <div className="flex-1 self-stretch bg-red-100" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="text-gray-9c text-center text-12 py-4">
                当前没有持有任何 NFT
              </div>

              <div className="border-t self-stretch mx-5" />
              <div className="flex self-stretch">
                <Button
                  className="px-5 py-4 flex-1"
                  variant="text"
                  color="link"
                  size="large"
                >
                  关联钱包
                </Button>
              </div>
            </div>
          </Popover>
        </ThemeLight>
      </div>
    </div>
  );
});
