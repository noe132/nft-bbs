import { useContext, useEffect } from 'react';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import scrollIntoView from 'scroll-into-view-if-needed';
import { observer, useLocalObservable } from 'mobx-react-lite';
import type { Comment } from 'nft-bbs-server';
import { Pagination } from '@mui/material';
import { sleep, useWiderThan } from '~/utils';

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

  const handleJumpToReply = (commentTrx: string) => {
    const index = state.comments.findIndex((v) => v.trxId === commentTrx);
    if (index === -1) { return; }
    const page = Math.ceil((index + 1) / state.pageSize);
    runInAction(() => {
      state.page = page;
      context.state.highlightedComments.add(commentTrx);
      state.scrollToComment = commentTrx;
    });
  };

  useEffect(action(() => {
    state.comments = [...props.comments].sort((a, b) => a.timestamp - b.timestamp);
  }), [props.comments]);

  useEffect(action(() => {
    if (!state.scrollToComment) { return; }
    const commentElement = document.querySelector(`[data-comment-trx-id="${state.scrollToComment}"]`);
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
        () => context.state.newCommentTrxId,
        async (trxId) => {
          await sleep();
          if (state.comments.some((v) => v.trxId === trxId)) {
            handleJumpToReply(trxId);
            runInAction(() => {
              context.state.newCommentTrxId = '';
            });
          }
        },
      ),
    ];

    const initCommentTrx = context.state.initCommentTrx;
    if (initCommentTrx && state.comments.some((v) => v.trxId === initCommentTrx)) {
      handleJumpToReply(initCommentTrx);
      runInAction(() => {
        context.state.initCommentTrx = '';
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
          key={v.trxId}
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
            共 {state.comments.length} 条回复
          </span>
        </div>
      )}
    </>
  );
});
