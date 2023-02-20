import { useContext, useEffect } from 'react';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import scrollIntoView from 'scroll-into-view-if-needed';
import { observer, useLocalObservable } from 'mobx-react-lite';
import type { Comment } from 'nft-bbs-server';
import { Pagination } from '@mui/material';
import { lang, sleep, useWiderThan } from '~/utils';

import { commentContext } from './context';
import { CommentItem } from './CommentItem';

export const SubCommentBox = observer((props: { comments: Array<Comment> }) => {
  const state = useLocalObservable(() => ({
    page: 1,
    pageSize: 7 as const,
    scrollToComment: '',

    comments: [...props.comments].sort((a, b) => a.timestamp - b.timestamp),
    get displayedComments() {
      return state.comments.slice(
        (this.page - 1) * this.pageSize,
        this.page * this.pageSize,
      );
    },

    get totalPages() {
      return Math.ceil(state.comments.length / this.pageSize);
    },
    get needPaging() {
      return this.pageSize < state.comments.length;
    },
  }));
  const isPC = useWiderThan(960);

  const context = useContext(commentContext);

  const handleJumpToReply = (commentId: string) => {
    const index = state.comments.findIndex((v) => v.id === commentId);
    if (index === -1) { return; }
    const page = Math.ceil((index + 1) / state.pageSize);
    runInAction(() => {
      state.page = page;
      context.state.highlightedComments.add(commentId);
      state.scrollToComment = commentId;
    });
  };

  useEffect(action(() => {
    state.comments = [...props.comments].sort((a, b) => a.timestamp - b.timestamp);
  }), [props.comments]);

  useEffect(action(() => {
    if (!state.scrollToComment) { return; }
    const commentElement = document.querySelector(`[data-comment-id="${state.scrollToComment}"]`);
    runInAction(() => {
      state.scrollToComment = '';
    });
    if (commentElement) {
      scrollIntoView(commentElement, {
        behavior: 'smooth',
      });
    }
  }), [state.scrollToComment]);

  useEffect(() => {
    const disposes = [
      reaction(
        () => context.state.newCommentId,
        async (id) => {
          await sleep();
          if (state.comments.some((v) => v.id === id)) {
            handleJumpToReply(id);
            runInAction(() => {
              context.state.newCommentId = '';
            });
          }
        },
      ),
    ];

    const initCommentId = context.state.initCommentId;
    if (initCommentId && state.comments.some((v) => v.id === initCommentId)) {
      handleJumpToReply(initCommentId);
      runInAction(() => {
        context.state.initCommentId = '';
      });
    }

    return () => disposes.forEach((v) => v());
  }, []);

  return (
    <>
      {state.displayedComments.map((v) => (
        <CommentItem
          className={classNames(
            'border-l !border-l-cyan-blue border-t border-t-white/20',
            isPC && 'pl-5',
            !isPC && 'pl-4',
          )}
          comment={v}
          key={v.id}
          onJumpToReply={handleJumpToReply}
        />
      ))}
      {state.needPaging && (
        <div className="flex items-center gap-x-4 mt-2 mb-3">
          <Pagination
            page={state.page}
            onChange={action((_, page) => { state.page = page; })}
            count={state.totalPages}
          />
          <span className="text-white/35 text-14">
            {lang.comment.replyCount(state.comments.length)}
          </span>
        </div>
      )}
    </>
  );
});
