import React, { useEffect, useRef, createContext, useContext } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Comment } from 'nft-bbs-server';
import { CounterName } from 'nft-bbs-types';
import { Button, Tooltip } from '@mui/material';

import ReplyIcon from 'boxicons/svg/regular/bx-reply.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import UnfoldIcon from '~/assets/icons/icon_unfold.svg?fill-icon';
import { Foldable, UserAvatar } from '~/components';
import { nodeService, snackbarService } from '~/service';
import { showTrxDetail } from '~/modals';
import { ago, runLoading } from '~/utils';
import { ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

interface CommentItemProps {
  className?: string
  comment: Comment
  topComment?: Comment
  onOpenUserCard: (e: React.MouseEvent, v: Comment) => unknown
  onReply: (e: React.MouseEvent, v: Comment) => unknown
}

export const commentContext = createContext<{
  weakMap: WeakMap<Comment, Array<string>>
  highlightedComments: Set<string>
}>({
  weakMap: new WeakMap(),
  highlightedComments: new Set(),
});

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
  }));
  const context = useContext(commentContext);
  const rootBox = useRef<HTMLDivElement>(null);

  const handleClearHighlight = action(() => {
    context.highlightedComments.delete(state.comment.trxId);
  });

  const handleJumpToRepliedComment = action(() => {
    const node = document.querySelector(`[data-comment-trx-id="${state.comment.replyId}"]`);
    context.highlightedComments.add(state.comment.replyId);
    if (node) {
      scrollIntoView(node, {
        behavior: 'smooth',
      });
    }
  });

  const handleUpdateCommentCounter = (type: CounterName.commentLike | CounterName.commentDislike) => {
    if (!nodeService.state.logined) {
      snackbarService.show('请先登录');
      return;
    }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.update({
        type: 'comment',
        item: state.comment,
        counterName: type,
      }),
    );
  };

  const highlighted = context.highlightedComments.has(state.comment.trxId);
  const subComments = (context.weakMap.get(state.comment) ?? [])
    .map((v) => nodeService.state.comment.map.get(v)!);

  useEffect(() => {
    if (!highlighted) { return; }
    setTimeout(() => {
      if (!rootBox.current) { return; }
      scrollIntoView(rootBox.current, { behavior: 'smooth' });
    });
  }, []);

  return (
    <div
      className={classNames(
        'comment-box',
        props.className,
      )}
      onClick={handleClearHighlight}
      style={{
        transitionProperty: 'background-color',
      }}
      ref={rootBox}
      data-comment-trx-id={state.comment.trxId}
    >
      <div
        className={classNames(
          'py-4 group duration-200',
          highlighted && 'bg-blue-400/20',
        )}
      >
        <div className="flex justify-between">
          <div className="flex items-center gap-x-4">
            <UserAvatar
              className="cursor-pointer"
              profile={state.profile}
              size={28}
              onClick={(e) => props.onOpenUserCard(e, state.comment)}
            />
            <div className="">
              <button
                className="text-16 text-rum-orange mr-4"
                onClick={(e) => props.onOpenUserCard(e, state.comment)}
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
                  onClick={handleJumpToRepliedComment}
                >
                  回复 {state.replyTo}
                </span>
              )}

              <button
                className="text-12 text-white/35"
                onClick={() => state.comment.storage === 'chain' && showTrxDetail(state.comment.trxId)}
              >
                {state.comment.storage === 'cache' ? '同步中' : '已同步'}
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
            {state.comment.storage === 'chain' && (
              <Button
                className={classNames(
                  'min-w-0 px-2 text-14',
                  !state.commentStat.liked && 'text-link-soft',
                  state.commentStat.liked && 'text-rum-orange',
                )}
                variant="text"
                size="small"
                onClick={() => handleUpdateCommentCounter(CounterName.commentLike)}
              >
                {!state.commentStat.likeCount && (
                  <ThumbUpOffAlt className="mr-2 text-18" />
                )}
                {!!state.commentStat.likeCount && (
                  <ThumbUpAlt className="mr-2 text-18" />
                )}
                {state.commentStat.likeCount || '赞'}
              </Button>
            )}
            {/* {state.comment.storage === 'chain' && (
              <Button
                className={classNames(
                  'min-w-0 px-2',
                  !state.commentStat.disliked && 'text-link-soft',
                  state.commentStat.disliked && 'text-rum-orange',
                )}
                variant="text"
                size="small"
                onClick={() => handleUpdateCommentCounter(CounterName.commentDislike)}
              >
                {!commentStat.dislikeCount && (
                  <ThumbDownOffAlt className="mr-2 text-18" />
                )}
                {!!commentStat.dislikeCount && (
                  <ThumbDownAlt className="mr-2 text-18" />
                )}
                {commentStat.dislikeCount || '踩'}
              </Button>
            )} */}
            {nodeService.state.logined && (
              <Button
                className="text-link-soft text-14 font-normal"
                variant="text"
                color="inherit"
                size="small"
                onClick={(e) => props.onReply(e, state.comment)}
              >
                <ReplyIcon className="mr-1 -mt-[2px] text-24" />
                回复
              </Button>
            )}
          </div>
        </div>

        <div className="text-white text-14 mt-2">
          {state.comment.content}
        </div>
      </div>

      {!!subComments.length && (
        <div className="border-l !border-l-cyan-blue">
          <CommentItem
            className="pl-5 border-t border-t-white/20"
            key={subComments[0].trxId}
            comment={subComments[0]}
            topComment={props.topComment || state.comment}
            onOpenUserCard={props.onOpenUserCard}
            onReply={(e) => props.onReply(e, subComments[0])}
          />
          <Foldable fold={!state.expand}>
            {subComments.slice(1).map((v) => (
              <CommentItem
                className="pl-5 border-t border-t-white/20"
                key={v.trxId}
                comment={v}
                topComment={props.topComment || state.comment}
                onOpenUserCard={props.onOpenUserCard}
                onReply={(e) => props.onReply(e, v)}
              />
            ))}
          </Foldable>
        </div>
      )}

      {subComments.length > 1 && (
        <div className="border-l border-l-cyan-blue p-3 pt-0">
          <Button
            className="text-link-soft text-14 font-normal px-2"
            variant="text"
            color="inherit"
            size="small"
            onClick={action(() => { state.expand = !state.expand; })}
          >
            {state.expand ? '收起' : '展开'} {subComments.length - 1} 条回复
            {state.expand && (<UnfoldIcon className="ml-2 -mt-[2px] text-14" />)}
            {!state.expand && (
              <ReplyIcon
                className="ml-2 text-22"
                style={{
                  transform: 'rotateZ(270deg) rotateX(180deg)',
                }}
              />
            )}
          </Button>
        </div>
      )}
    </div>
  );
});
