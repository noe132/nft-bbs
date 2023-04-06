import React, { useContext, useEffect } from 'react';
import { reaction, runInAction } from 'mobx';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Comment } from 'rum-port-server';

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

  const handleJumpToReply = (commentId: string) => {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
      runInAction(() => {
        context.state.highlightedComments.add(commentId);
      });
      scrollIntoView(commentElement, {
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const initCommentId = context.state.initCommentId;
    if (initCommentId && props.comments.some((v) => v.id === initCommentId)) {
      handleJumpToReply(initCommentId);
      runInAction(() => {
        context.state.initCommentId = '';
      });
    }
    const dispose = reaction(
      () => context.state.newCommentId,
      async (id) => {
        await sleep();
        if (props.comments.some((v) => v.id === id)) {
          handleJumpToReply(id);
          runInAction(() => {
            context.state.newCommentId = '';
          });
        }
      },
    );

    return dispose;
  }, []);

  useEffect(() => {
    const id = context.state.newCommentId;
    const run = async () => {
      await sleep();
      await sleep();
      if (props.comments.some((v) => v.id === id)) {
        handleJumpToReply(id);
      }
    };
    run();
  }, [context.state.newCommentId]);

  return (
    <div className="comment-box">
      {props.comments.map((item, i) => {
        const subComments = (context.state.weakMap.get(item) ?? [])
          .map((v) => nodeService.state.comment.map.get(v)!);
        return (
          <React.Fragment key={item.id}>
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
