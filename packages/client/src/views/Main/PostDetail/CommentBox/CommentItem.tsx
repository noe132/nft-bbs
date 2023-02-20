import { useContext, useRef } from 'react';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import LinkifyIt from 'linkify-it';
import type { Comment } from 'nft-bbs-server';
import { Button, Tooltip } from '@mui/material';
import { ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

import ReplyIcon from 'boxicons/svg/regular/bx-reply.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { UserAvatar } from '~/components';
import { imageZoomService, nftService, nodeService, snackbarService } from '~/service';
import { showTrxDetail } from '~/modals';
import { ago, lang, runLoading, useWiderThan } from '~/utils';
import { commentContext } from './context';

interface CommentItemProps {
  className?: string
  comment: Comment
  onJumpToReply?: (id: string) => unknown
}

const linkifyIt = LinkifyIt();
export const CommentItem = observer((props: CommentItemProps) => {
  const state = useLocalObservable(() => ({
    expand: true,
    likeLoading: false,
    get comment() {
      return nodeService.state.comment.map.get(props.comment.id) || props.comment;
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
      return !nodeService.state.comment.cache.includes(state.comment.id);
    },
  }));
  const isPC = useWiderThan(960);

  const boxRef = useRef<HTMLDivElement>(null);
  const context = useContext(commentContext);

  const handleClearHighlight = () => {
    context.state.highlightedComments.delete(props.comment.id);
  };

  const handleToggleCommentCounter = () => {
    if (!nftService.hasPermissionAndTip('counter')) { return; }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.update(
        state.comment,
        state.commentStat.liked ? 'undolike' : 'like',
      ),
    );
  };

  const handleReply = () => {
    if (!state.synced) {
      snackbarService.show(lang.comment.waitForSync);
      return;
    }
    context.onReply(state.comment);
  };

  const renderTextWithLink = (text: string) => {
    const match = linkifyIt.match(text);
    if (match) {
      const sections = [
        {
          start: 0,
          end: match[0].index,
          link: null,
        },
        ...match.flatMap((v, i, a) => [
          {
            start: v.index,
            end: v.lastIndex,
            link: v.url,
          },
          {
            start: v.lastIndex,
            end: i === a.length - 1
              ? text.length
              : a[i + 1].index,
            link: null,
          },
        ]),
      ].filter((v) => v.start !== v.end);

      return sections.map((v, i) => {
        const content = text.slice(v.start, v.end);
        return v.link
          ? <a className="text-link-soft" href={v.link} target="_blank" rel="noopener" key={i}>{content}</a>
          : <span key={i}>{content}</span>;
      });
    }

    return text;
  };

  const highlighted = context.state.highlightedComments.has(state.comment.id);

  const commentButtonBox = (
    <div
      className={classNames(
        'flex gap-x-2 h-[34px] items-center',
        !isPC && '-ml-2 mt-2',
      )}
    >
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
        <Tooltip title={nftService.permissionTip('counter')}>
          <Button
            className={classNames(
              'min-w-0 px-2 text-14 normal-case',
              !nftService.state.permissionMap.counter && '!text-gray-9c',
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
            {state.commentStat.likeCount || lang.common.like}
          </Button>
        </Tooltip>
      )}
      {nodeService.state.logined && (
        <Tooltip title={nftService.permissionTip('comment')}>
          <Button
            className={classNames(
              'text-link-soft text-14 font-normal normal-case',
              !nftService.state.permissionMap.comment && '!text-gray-9c',
            )}
            variant="text"
            color="inherit"
            size="small"
            onClick={handleReply}
          >
            <ReplyIcon className="mr-1 -mt-[2px] text-24" />
            {lang.comment.reply}
          </Button>
        </Tooltip>
      )}
    </div>
  );
  return (
    <div
      className={classNames(
        'py-4 group duration-200 transition-bg',
        highlighted && 'bg-blue-400/20',
        props.className,
      )}
      onClick={handleClearHighlight}
      data-comment-id={props.comment.id}
      ref={boxRef}
    >
      <div className="flex justify-between">
        <div className="flex items-center gap-x-4">
          <UserAvatar
            className="cursor-pointer flex-none"
            profile={state.profile}
            size={28}
            onClick={() => context.onOpenUserCard(state.comment, boxRef.current!)}
          />
          <div className="break-all">
            <a
              className="text-16 text-rum-orange mr-4 cursor-pointer"
              onClick={() => context.onOpenUserCard(state.comment, boxRef.current!)}
            >
              {state.profile?.name || state.profile?.userAddress.slice(0, 10)}
            </a>

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
                {lang.comment.replyTo} {state.replyTo}
              </span>
            )}

            <button
              className="text-12 text-white/35"
              onClick={() => state.synced && showTrxDetail(state.comment.trxId, 'comment')}
            >
              {state.synced ? lang.common.synced : lang.common.sycing}
            </button>
          </div>
        </div>
        {isPC && commentButtonBox}
      </div>

      <div
        className={classNames(
          'text-white text-14 break-all',
          isPC && 'mt-2',
          !isPC && 'mt-3',
        )}
      >
        {state.comment.content.split('\n').map((v, i) => (
          <p key={i}>
            {renderTextWithLink(v)}
          </p>
        ))}
      </div>

      {!!state.comment.extra?.images && !!state.comment.extra.images.length && (
        <div className="flex gap-4 mt-4">
          {state.comment.extra.images.map((v) => (
            <img
              className="w-16 h-16 rounded-lg"
              src={`data:${v.mineType};base64,${v.content}`}
              alt=""
              key={v.id}
              onClick={(e) => imageZoomService.openImage(e.currentTarget)}
            />
          ))}
        </div>
      )}

      {!isPC && commentButtonBox}
    </div>
  );
});
