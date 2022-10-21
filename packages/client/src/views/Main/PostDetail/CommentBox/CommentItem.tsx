import { useContext, useRef } from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import type { Comment } from 'nft-bbs-server';
import { Button, Tooltip } from '@mui/material';
import { ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

import ReplyIcon from 'boxicons/svg/regular/bx-reply.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { UserAvatar } from '~/components';
import { imageZoomService, nodeService, snackbarService } from '~/service';
import { showTrxDetail } from '~/modals';
import { ago, runLoading } from '~/utils';
import { commentContext } from './context';

interface CommentItemProps {
  className?: string
  comment: Comment
  onJumpToReply?: (trxId: string) => unknown
}

export const CommentItem = observer((props: CommentItemProps) => {
  const state = useLocalObservable(() => ({
    expand: true,
    likeLoading: false,
    get comment() {
      return nodeService.state.comment.map.get(props.comment.trxId) || props.comment;
    },
    get replyTo() {
      if (!this.comment.replyId) { return null; }
      const commentRepliedTo = nodeService.state.comment.map.get(this.comment.replyId);
      if (!commentRepliedTo) { return null; }
      const commentRepliedToProfile = nodeService.profile.getComputedProfile(
        commentRepliedTo.extra?.userProfile ?? commentRepliedTo.userAddress ?? '',
      );
      return commentRepliedToProfile.name || commentRepliedToProfile.userAddress.slice(0, 10);
    },
    get profile() {
      return nodeService.profile.getComputedProfile(
        this.comment?.extra?.userProfile ?? this.comment?.userAddress ?? '',
      );
    },
    get commentStat() {
      return nodeService.comment.getStat(this.comment);
    },
    get synced() {
      return !nodeService.state.comment.cache.get(state.comment.groupId)?.has(state.comment.trxId);
    },
  }));

  const boxRef = useRef<HTMLDivElement>(null);
  const context = useContext(commentContext);

  const handleClearHighlight = () => {
    context.state.highlightedComments.delete(props.comment.trxId);
  };

  const handleToggleCommentCounter = () => {
    if (nodeService.state.postPermissionTip) {
      snackbarService.show(nodeService.state.postPermissionTip);
      return;
    }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.updateComment(
        state.comment,
        state.commentStat.liked ? 'Dislike' : 'Like',
      ),
    );
  };

  const highlighted = context.state.highlightedComments.has(state.comment.trxId);
  return (
    <div
      className={classNames(
        'py-4 group duration-200',
        highlighted && 'bg-blue-400/20',
        props.className,
      )}
      onClick={handleClearHighlight}
      data-comment-trx-id={props.comment.trxId}
      ref={boxRef}
    >
      <div className="flex justify-between">
        <div className="flex items-center gap-x-4">
          <UserAvatar
            className="cursor-pointer"
            profile={state.profile}
            size={28}
            onClick={() => context.onOpenUserCard(state.comment, boxRef.current!)}
          />
          <div className="">
            <button
              className="text-16 text-rum-orange mr-4"
              onClick={() => context.onOpenUserCard(state.comment, boxRef.current!)}
            >
              {state.profile?.name || state.profile?.userAddress.slice(0, 10)}
            </button>

            <Tooltip title={format(state.comment.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
              <span className="text-12 text-gray-af mr-4">
                {ago(state.comment.timestamp)}
              </span>
            </Tooltip>

            {!!state.replyTo && (
              <span
                className="text-12 text-white/40 mr-4 cursor-pointer"
                onClick={() => props.onJumpToReply?.(state.comment.replyId)}
              >
                回复 {state.replyTo}
              </span>
            )}

            <button
              className="text-12 text-white/35"
              onClick={() => state.synced && showTrxDetail(state.comment.trxId)}
            >
              {state.synced ? '已同步' : '同步中'}
            </button>
          </div>
        </div>
        <div className="flex gap-x-2 h-[34px] items-center">
          {false && (
            <Button
              className="text-link-soft text-14 font-normal hidden group-hover:flex"
              variant="text"
              color="inherit"
            >
              <WineIcon className="mr-1 -mt-[2px] text-16" />
              给TA买一杯
            </Button>
          )}
          {state.synced && (
            <Tooltip title={nodeService.state.postPermissionTip}>
              <Button
                className={classNames(
                  'min-w-0 px-2 text-14',
                  !state.commentStat.liked && 'text-link-soft',
                  state.commentStat.liked && 'text-rum-orange',
                )}
                variant="text"
                size="small"
                onClick={() => handleToggleCommentCounter()}
              >
                {!state.commentStat.likeCount && (
                  <ThumbUpOffAlt className="mr-2 text-18" />
                )}
                {!!state.commentStat.likeCount && (
                  <ThumbUpAlt className="mr-2 text-18" />
                )}
                {state.commentStat.likeCount || '赞'}
              </Button>
            </Tooltip>
          )}
          {nodeService.state.logined && (
            <Tooltip title={nodeService.state.postPermissionTip}>
              <Button
                className="text-link-soft text-14 font-normal"
                variant="text"
                color="inherit"
                size="small"
                onClick={() => context.onReply(state.comment)}
              >
                <ReplyIcon className="mr-1 -mt-[2px] text-24" />
                回复
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="text-white text-14 mt-2">
        {state.comment.content}
      </div>
      {!!state.comment.extra?.images && (
        <div className="flex gap-4 mt-4">
          {state.comment.extra.images.map((v) => (
            <img
              className="w-16 h-16 rounded-lg"
              src={`data:${v.mineType};base64,${v.content}`}
              alt=""
              key={v.name}
              onClick={(e) => imageZoomService.openImage(e.currentTarget)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
