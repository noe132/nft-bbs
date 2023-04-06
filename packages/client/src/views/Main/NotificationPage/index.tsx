import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import RemoveMarkdown from 'remove-markdown';
import type { Notification } from 'rum-port-server';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { ChevronLeft, ExpandMore, ThumbDownAlt, ThumbUpAlt } from '@mui/icons-material';

import ReplyIcon from 'boxicons/svg/regular/bx-reply.svg?fill-icon';
import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import BellIcon from 'boxicons/svg/regular/bx-bell.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { UserAvatar, BackButton, ScrollToTopButton, GroupCard, NFTSideBox, Scrollable } from '~/components';
import { nodeService, routerService } from '~/service';
import { ago, lang, useWiderThan } from '~/utils';

export const NotificationPage = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    get notificationsWithoutDislike() {
      return nodeService.state.notification.list.filter((v) => v.type !== 'dislike');
    },
    intersectionRatio: 0,
    pauseAutoLoading: false,
  }));
  const isPC = useWiderThan(960);

  const loadingTriggerBox = useRef<HTMLDivElement>(null);

  const handleViewItem = (v: Notification) => {
    if (v.type === 'nftrequest') {
      window.open('/admin');
      return;
    }
    const post = v.extra?.object?.value;
    if (!post) { return; }
    const postId = 'postId' in post
      ? post.postId
      : 'id' in post ? post.id! : '';
    routerService.navigate({
      page: 'postdetail',
      id: postId.toString(),
      commentId: v.actionObjectType === 'comment'
        ? v.actionObjectId
        : undefined,
    });
  };

  useEffect(() => {
    nodeService.group.setDocumentTitle(lang.notification.pageTitle);
    const loadNextPage = async () => {
      if (nodeService.state.notification.loading || nodeService.state.notification.done) {
        return;
      }
      if (state.pauseAutoLoading) { return; }
      if (state.intersectionRatio > 0.1) {
        const list = await nodeService.notification.load({ nextPage: true });
        runInAction(() => {
          state.pauseAutoLoading = !list;
        });
        loadNextPage();
      }
    };

    nodeService.notification.load();

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


  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="flex-col relative w-[800px]">
        {isPC && (<>
          <div className="flex justify-end w-full">
            <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
          </div>
          <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />
        </>)}
        <div className="flex-col flex-1 w-full bg-black/80">
          <div
            className={classNames(
              'flex justify-between text-white py-6',
              isPC && 'px-10',
              !isPC && 'px-4',
            )}
          >

            <div
              className="flex flex-center text-18"
              onClick={() => !isPC && routerService.navigate({ page: 'postlist' })}
            >
              {!isPC && (
                <ChevronLeft className="text-28 -mb-px" />
              )}
              {lang.notification.pageTitle}
            </div>
            {/* <Button
              className="text-soft-blue text-14 px-3"
              variant="text"
              color="inherit"
              size="small"
              onClick={() => snackbarService.show('已全部标为已读')}
            >
              全部已读
            </Button> */}
          </div>
          <div className="flex-col mt-3">
            {state.notificationsWithoutDislike.map((v) => {
              const actionTexts = [
                ['post', 'comment', lang.notification.types.postComment],
                ['post', 'like', lang.notification.types.postLike],
                ['post', 'dislike', lang.notification.types.postDislike],
                ['comment', 'comment', lang.notification.types.commentComment],
                ['comment', 'like', lang.notification.types.commentLike],
                ['comment', 'dislike', lang.notification.types.commentDislike],
              ] as const;
              const fromProfile = nodeService.profile.getComputedProfile(v.extra?.fromProfile ?? v.from);
              const fromProfileName = fromProfile?.name || v.from.slice(0, 10);
              const actionText = actionTexts.find((u) => u[0] === v.objectType && u[1] === v.type)?.[2] ?? '';
              let content = '';
              if (v.type === 'comment') {
                content = v.extra?.actionObject?.value.content ?? '';
              } else {
                const object = v.extra?.object?.value;
                if (object && 'content' in object) {
                  if (v.objectType === 'post') {
                    const postContent = object.content ?? '';
                    const md = postContent.replaceAll(/!\[.*?\]\(.+?\)/g, lang.common.imagePlaceholder);
                    content = RemoveMarkdown(md);
                  }
                  if (v.objectType === 'comment') {
                    const commentContent = object.content ?? '';
                    content = commentContent;
                  }
                }
                if (v.type === 'nftrequest' && v.extra?.object?.type === 'nftrequest' && object && 'memo' in object) {
                  content = `${lang.notification.nft.request}${object.memo}`;
                }
                if (v.type === 'nftrequestresponse' && v.extra?.object?.type === 'nftrequest' && object && 'memo' in object) {
                  content = lang.notification.nft.response(object.status === 'approved', object.reply);
                }
              }
              const showViewItem = ['comment', 'like', 'dislike', 'nftrequest'].includes(v.type);
              return (
                <React.Fragment key={v.id}>
                  <div className="flex-col px-8 py-3 gap-y-4">
                    <div className="flex justify-between">
                      <div
                        className={classNames(
                          'flex items-center',
                          isPC && 'ml-8',
                        )}
                      >
                        <UserAvatar
                          className="cursor-pointer mr-3 flex-none"
                          profile={fromProfile}
                          onClick={() => routerService.navigate({ page: 'userprofile', userAddress: fromProfile.userAddress })}
                        />

                        <span className="break-all text-start">
                          <Link
                            className="cursor-pointer !no-underline"
                            to={routerService.getPath({ page: 'userprofile', userAddress: fromProfile.userAddress })}
                          >
                            <span className="text-rum-orange text-16 mr-3">
                              {fromProfileName}
                            </span>
                          </Link>

                          {!!v.timestamp && (
                            <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                              <span className="text-gray-af text-12 mr-3">
                                {ago(v.timestamp)}
                              </span>
                            </Tooltip>
                          )}

                          <span className="text-14 text-white mr-3">
                            {actionText}
                          </span>

                          {isPC && showViewItem && (
                            <button
                              className="text-link-soft text-14"
                              onClick={() => handleViewItem(v)}
                            >
                              {lang.notification.goToItem}
                            </button>
                          )}
                        </span>
                      </div>
                      {isPC && (
                        <div className="flex gap-x-4 ml-8">
                          {v.type === 'comment' && (
                            <Button
                              className="text-link-soft"
                              variant="text"
                              size="small"
                              onClick={() => handleViewItem(v)}
                            >
                              <ReplyIcon className="mr-1 -mt-[2px] text-24" />
                              {lang.comment.reply}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className="flex items-center"
                      onClick={() => !isPC && showViewItem && handleViewItem(v)}
                    >
                      {v.type === 'like' && (
                        <ThumbUpAlt className="flex-none mr-3 -mb-px text-18 text-link-soft" />
                      )}
                      {v.type === 'dislike' && (
                        <ThumbDownAlt className="flex-none mr-3 -mb-px text-18 text-link-soft" />
                      )}
                      {v.type === 'comment' && (
                        <CommentDetailIcon className="flex-none mr-3 -mb-px text-18 text-link-soft" />
                      )}
                      {v.type === 'nftrequest' && (
                        <BellIcon className="flex-none mr-3 -mb-px text-18 text-link-soft" />
                      )}
                      {v.type === 'nftrequestresponse' && (
                        <BellIcon className="flex-none mr-3 -mb-px text-18 text-link-soft" />
                      )}
                      {false && (
                        <WineIcon className="flex-none mr-3 -mb-px text-18 text-rum-orange" />
                      )}

                      <div
                        className={classNames(
                          'truncate-2 text-blue-gray text-14 px-2',
                          v.type !== 'comment' && 'border-l border-[#b4daff]',
                        )}
                      >
                        {content}
                        {!content && (<span>&nbsp;</span>)}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/15 my-2 mx-8" />
                </React.Fragment>
              );
            })}

            <div className="flex flex-center h-16 pb-4">
              {!nodeService.state.notification.loading && !state.notificationsWithoutDislike.length && (
                <div className="flex flex-center text-white text-14">
                  {lang.notification.emptyTip}
                </div>
              )}
              <div
                className="absolute h-[400px] w-0 bottom-0 pointer-events-none"
                ref={loadingTriggerBox}
              />
              {nodeService.state.notification.loading && (
                <CircularProgress className="text-white/70" />
              )}
              {!nodeService.state.notification.loading && !nodeService.state.notification.done && (
                <Button
                  className="flex-1 text-link-soft py-2"
                  variant="text"
                  onClick={() => nodeService.notification.load({ nextPage: true })}
                >
                  {lang.common.loadMore}
                  <ExpandMore />
                </Button>
              )}
              {nodeService.state.notification.done && nodeService.state.notification.list.length > 10 && (
                <span className="text-white/60 text-14">
                  {lang.common.noMore}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPC && (
        <div className="w-[280px]">
          <div
            className="fixed flex-col w-[280px]"
            style={{ maxHeight: 'calc(100vh - 64px)' }}
          >
            <Scrollable className="flex-1 h-0" hideTrack>
              <GroupCard className="mt-16" showNewPost />
              <NFTSideBox />
              <div className="h-[100px] w-full" />
            </Scrollable>
          </div>
        </div>
      )}
    </div>
  );
});
