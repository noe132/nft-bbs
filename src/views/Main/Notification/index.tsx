import React, { useEffect } from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import RemoveMarkdown from 'remove-markdown';
import { Button, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { AlternateEmail, ThumbDownAlt, ThumbUpAlt } from '@mui/icons-material';

import ReplyIcon from 'boxicons/svg/regular/bx-reply.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';
import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { UserAvatar, BackButton, ScrollToTopButton } from '~/components';
import { nodeService, snackbarService, viewService } from '~/service';
import { INotification, NotificationObjectType, NotificationType } from '~/database';
import { ago } from '~/utils';
import { GroupAvatar } from '~/components/GroupAvatar';
import { editGroupInfo } from '~/modals';

export const Notification = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    get notificationsWithoutDislike() {
      return nodeService.state.notification.list.filter((v) => v.type !== NotificationType.dislike);
    },
  }));

  const handleViewItem = async (v: INotification) => {
    const post = await nodeService.post.getPost(v.objectId);
    if (!post) { return; }
    viewService.pushPage('postdetail', post, v.actionTrxId);
  };

  const handleNewPost = () => {
    if (!nodeService.state.logined) {
      snackbarService.show('请先登录');
      return;
    }
    viewService.pushPage('newpost');
  };

  useEffect(() => {
    nodeService.notification.load();
  }, []);

  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="flex-col relative w-[800px]">
        <div className="flex justify-end w-full">
          <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full" />
        </div>
        <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />
        <div className="flex-col flex-1 w-full bg-black/70">
          <div className="flex justify-between text-white py-6 px-10">
            <div className="text-18">消息通知</div>
            <Button
              className="text-soft-blue text-14 px-3"
              variant="text"
              color="inherit"
              size="small"
            >
              全部已读
            </Button>
          </div>
          <div className="flex-col mt-3">
            {state.notificationsWithoutDislike.map((v) => {
              const fromProfile = nodeService.state.profile.map.get(v.fromUserAddress);
              const fromProfileName = fromProfile ? fromProfile.name : v.fromUserAddress.slice(0, 10);
              const actionText = actionTexts.find((u) => u[0] === v.objectType && u[1] === v.type)?.[2] ?? '';
              let content = '';
              if (v.type === NotificationType.comment) {
                if (!nodeService.state.comment.map.has(v.actionTrxId)) {
                  nodeService.comment.loadOne(v.actionTrxId);
                }
                const comment = nodeService.state.comment.map.get(v.actionTrxId);
                content = comment?.content ?? '';
              } else {
                if (v.objectType === NotificationObjectType.post) {
                  content = RemoveMarkdown(
                    nodeService.state.post.map.get(v.objectId)!.content
                      .replaceAll(/!\[.*?\]\(.+?\)/g, '[图片]'),
                  );
                }
                if (v.objectType === NotificationObjectType.comment) {
                  // TODO: 给评论点赞的notification。需要获取被点赞评论的content
                  // content = nodeService.state.comment.map.get(v.objectId)!.content;
                }
              }
              return (
                <React.Fragment key={v.id}>
                  <div className="flex-col px-8 gap-y-4">
                    <div className="flex items-center gap-x-3 ml-8">
                      <UserAvatar profile={fromProfile} />
                      <div className="">
                        <span className="text-rum-orange text-16 mr-3">
                          {fromProfileName}
                        </span>
                        <Tooltip title={format(v.actionTimestamp, 'yyyy-MM-dd HH:mm:ss')}>
                          <span className="text-gray-af text-12 mr-3">
                            {ago(v.actionTimestamp)}
                          </span>
                        </Tooltip>
                        <span className="text-14 text-white">
                          {actionText}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {v.type === NotificationType.like && (
                        <ThumbUpAlt className="flex-none mr-3 -mb-px text-26 text-link-soft" />
                      )}
                      {v.type === NotificationType.dislike && (
                        <ThumbDownAlt className="flex-none mr-3 -mb-px text-26 text-link-soft" />
                      )}
                      {v.type === NotificationType.comment && (
                        <CommentDetailIcon className="flex-none mr-3 -mb-px text-26 text-link-soft" />
                      )}
                      {false && (
                        <AlternateEmail className="flex-none mr-3 -mb-px text-26 text-link-soft" />
                      )}
                      {false && (
                        <WineIcon className="flex-none mr-3 -mb-px text-26 text-rum-orange" />
                      )}

                      <div
                        className={classNames(
                          'truncate-2 text-blue-gray text-14 px-2',
                          v.type !== NotificationType.comment && 'border-l border-[#b4daff]',
                        )}
                      >
                        {content}
                        {!content && (<span>&nbsp;</span>)}
                      </div>
                    </div>
                    <div className="flex gap-x-4 ml-8">
                      <Button
                        className="text-link-soft"
                        variant="text"
                        size="small"
                        onClick={() => handleViewItem(v)}
                      >
                        前往查看
                      </Button>
                      {v.type === NotificationType.comment && (
                        <Button
                          className="text-link-soft"
                          variant="text"
                          size="small"
                          onClick={() => handleViewItem(v)}
                        >
                          <ReplyIcon className="mr-1 -mt-[2px] text-24" />
                          回复
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/15 my-4 mx-16" />
                </React.Fragment>
              );
            })}

            {nodeService.state.notification.loading && (
              <div className="flex flex-center p-4">
                <CircularProgress />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-[280px]">
        <div className="flex-col gap-y-9 flex-center relative bg-black/70 h-[240px] pt-16 mt-16">
          <div className="overflow-hidden absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
            <IconButton
              className="p-0 group text-white"
              onClick={editGroupInfo}
            >
              <GroupAvatar className="flex cursor-pointer border border-white/80 overflow-hidden" size={100} />
              <div className="absolute inset-0 flex-center bg-white/10 hidden rounded-full group-hover:flex">
                <EditIcon className="text-30 text-white/70" />
              </div>
            </IconButton>
          </div>
          <div className="text-white text-center text-18">
            {nodeService.state.groupName}
          </div>
          <Tooltip title={!nodeService.state.logined ? '请先登录' : ''}>
            <Button
              className="rounded-full text-16 px-5 py-[7px]"
              variant="outlined"
              color={nodeService.state.logined ? 'rum' : 'dark-blue'}
              onClick={handleNewPost}
            >
              <EditIcon className="text-22 mr-3 mb-px" />
              发布新帖
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

const actionTexts = [
  [NotificationObjectType.post, NotificationType.comment, '评论了您的帖子'],
  [NotificationObjectType.post, NotificationType.like, '给你的帖子点赞'],
  [NotificationObjectType.post, NotificationType.dislike, '给你的帖子点踩'],
  [NotificationObjectType.comment, NotificationType.comment, '评论了您的评论'],
  [NotificationObjectType.comment, NotificationType.like, '给你的评论点赞'],
  [NotificationObjectType.comment, NotificationType.dislike, '给你的评论点踩'],
] as const;
