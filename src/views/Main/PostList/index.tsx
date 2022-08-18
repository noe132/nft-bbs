import { useEffect } from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import RemoveMarkdown from 'remove-markdown';
import { ExpandMore, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import { Button, CircularProgress, Tooltip } from '@mui/material';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';

import { ScrollToTopButton, GroupSideBox, NFTSideBox } from '~/components';
import { viewService, nodeService, snackbarService } from '~/service';
import { ago, runLoading } from '~/utils';
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

  const handleOpenPost = (post: IPost) => {
    viewService.pushPage('postdetail', post);
  };

  const handleUpdatePostCounter = (post: IPost, type: CounterName) => {
    if (!nodeService.state.logined) {
      snackbarService.show('请先登录');
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
                      {v.summary.likeCount || '赞'}
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
                      {v.summary.dislikeCount || '踩'}
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
        <GroupSideBox className="mt-16" showNewPost />

        <NFTSideBox className="mt-8" />
      </div>
    </div>
  );
});
