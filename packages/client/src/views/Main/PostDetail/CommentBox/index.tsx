import React, { useContext, useEffect } from 'react';
import { reaction, runInAction } from 'mobx';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Comment } from 'nft-bbs-server';

import { nodeService } from '~/service';

import { CommentItem } from './CommentItem';
import { SubCommentBox } from './SubCommentBox';
import { commentContext } from './context';
import { sleep } from '~/utils';

interface Props {
  className?: string
  comments: Array<Comment>
}

export const CommentBox = observer((props: Props) => {
  const context = useContext(commentContext);

  const handleJumpToReply = (commentTrx: string) => {
    const commentElement = document.querySelector(`[data-comment-trx-id="${commentTrx}"]`);
    if (commentElement) {
      runInAction(() => {
        context.state.highlightedComments.add(commentTrx);
      });
      scrollIntoView(commentElement, {
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const initCommentTrx = context.state.initCommentTrx;
    if (initCommentTrx && props.comments.some((v) => v.trxId === initCommentTrx)) {
      handleJumpToReply(initCommentTrx);
      runInAction(() => {
        context.state.initCommentTrx = '';
      });
    }
    const dispose = reaction(
      () => context.state.newCommentTrxId,
      async (trxId) => {
        await sleep();
        if (props.comments.some((v) => v.trxId === trxId)) {
          handleJumpToReply(trxId);
          runInAction(() => {
            context.state.newCommentTrxId = '';
          });
        }
      },
    );

    return dispose;
  }, []);

  useEffect(() => {
    const trxId = context.state.newCommentTrxId;
    const run = async () => {
      await sleep();
      await sleep();
      if (props.comments.some((v) => v.trxId === trxId)) {
        handleJumpToReply(trxId);
      }
    };
    run();
  }, [context.state.newCommentTrxId]);

  return (
    <div className="comment-box">
      {props.comments.map((item, i) => {
        const subComments = (context.state.weakMap.get(item) ?? [])
          .map((v) => nodeService.state.comment.map.get(v)!);
        return (
          <React.Fragment key={item.trxId}>
            <CommentItem
              className={classNames(
                i !== 0 && 'border-t border-t-white/20',
              )}
              comment={item}
            />
            {!!subComments.length && (
              <SubCommentBox comments={subComments} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});
