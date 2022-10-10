import type { Comment } from 'nft-bbs-server';
import { createContext } from 'react';

export interface CommentContext {
  state: {
    newCommentTrxId: string
    weakMap: WeakMap<Comment, Array<string>>
    highlightedComments: Set<string>
  }
  onOpenUserCard: (v: Comment, commentBox: HTMLElement) => unknown
  onReply: (v: Comment) => unknown
}

export const commentContext = createContext<CommentContext>({
  state: {
    newCommentTrxId: '',
    weakMap: new WeakMap(),
    highlightedComments: new Set(),
  },
  onOpenUserCard: () => {},
  onReply: () => {},
});
