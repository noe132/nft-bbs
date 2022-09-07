import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Comment, Profile } from 'nft-bbs-server';
import { Button, CircularProgress, ClickAwayListener, Fade, IconButton, InputBase, Tooltip } from '@mui/material';
import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import CommentMinusIcon from 'boxicons/svg/regular/bx-comment-minus.svg?fill-icon';
import ReplyIcon from 'boxicons/svg/regular/bx-reply.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import UnfoldIcon from '~/assets/icons/icon_unfold.svg?fill-icon';
import { BackButton, ScrollToTopButton, Foldable, UserAvatar } from '~/components';
import { nodeService, snackbarService, viewService } from '~/service';
import { showTrxDetail } from '~/modals';
import { ago, runLoading } from '~/utils';

import { PostDetailBox } from '../components/PostDetailBox';
import { UserCard } from '../components/UserCard';

interface UserCardItem {
  el: HTMLElement
  id: number
  top: number
  in: boolean
  profile?: Profile | null
}

export const PostDetail = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    commentTrxIds: [] as Array<string>,
    replyTo: {
      open: false,
      comment: null as null | Comment,
      content: '',
    },
    userCardId: 0,
    userCards: [] as Array<UserCardItem>,
    commentLoading: false,
    commentSort: 'latest' as 'latest' | 'oldest',
    commentInput: '',
    commentPosting: false,
    highlightedComments: new Set<string>(),
    get post() {
      return viewService.state.page.page.name === 'postdetail'
        ? viewService.state.page.page.value.post
        : null;
    },
    commentChildrenWeakMap: new WeakMap<Comment, Array<string>>(),
    get replyToProfile() {
      return nodeService.profile.getComputedProfile(
        state.replyTo.comment?.extra?.userProfile
          ?? state.replyTo.comment?.userAddress
          ?? '',
      );
    },
    get comments() {
      return state.commentTrxIds.map((v) => nodeService.state.comment.map.get(v)!);
    },
    get commentTree() {
      state.commentTrxIds.forEach((trxId) => {
        const comment = nodeService.state.comment.map.get(trxId)!;
        if (comment.threadId) {
          const parent = nodeService.state.comment.map.get(comment.threadId);
          if (parent) {
            const children = this.commentChildrenWeakMap.get(parent) ?? [];
            if (!children.includes(comment.trxId)) {
              children.push(comment.trxId);
            }
            this.commentChildrenWeakMap.set(parent, children);
          }
        }
      });
      return state.commentTrxIds
        .map((v) => nodeService.state.comment.map.get(v)!)
        .filter((v) => !v.threadId);

      // const comments: Array<CommentTreeItem> = JSON.parse(JSON.stringify(this.comments));
      // const map = new Map(comments.map((v) => [v.trxId, v]));
      // for (const item of map.values()) {
      //   if (item.threadId) {
      //     const parent = map.get(item.threadId);
      //     if (parent) {
      //       parent.children = parent.children ?? [];
      //       parent.children.push(item);
      //     }
      //   }
      // }
      // return comments.filter((v) => !v.threadId);
    },
    get sortedCommentTree() {
      return [...this.commentTree].sort((a, b) => (
        this.commentSort === 'latest'
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp
      ));
    },
    get profile() {
      return nodeService.profile.getComputedProfile(
        state.post?.extra?.userProfile ?? state.post?.userAddress ?? '',
      );
    },
  }));

  const commentBox = useRef<HTMLDivElement>(null);
  const replyTextarea = useRef<HTMLTextAreaElement>(null);

  const handleOpenUserCard = action((e: React.MouseEvent, v: Comment) => {
    let commentBox: null | HTMLElement = null;
    let parent: HTMLElement | null = e.currentTarget as HTMLElement;
    while (parent) {
      if (parent.classList.contains('comment-box')) {
        commentBox = parent;
        break;
      }
      parent = parent.parentElement;
    }
    if (!commentBox) { return; }
    if (state.userCards.some((v) => v.el === commentBox && v.in)) {
      return;
    }

    state.userCardId += 1;
    state.userCards.forEach((v) => handleRemoveUserCard(v));
    state.userCards.push({
      el: commentBox,
      id: state.userCardId,
      top: commentBox.offsetTop,
      in: true,
      profile: v.extra?.userProfile,
    });
  });

  const handleRemoveUserCard = action((v: UserCardItem) => {
    v.in = false;
    setTimeout(action(() => {
      const index = state.userCards.indexOf(v);
      if (index !== -1) {
        state.userCards.splice(index, 1);
      }
    }), 3000);
  });

  const handleReply = action((e: React.MouseEvent, v: Comment) => {
    state.replyTo = {
      comment: v,
      open: true,
      content: '',
    };
    setTimeout(() => {
      replyTextarea.current?.focus();
    });
  });

  const handlePostComment = async (type: 'direct' | 'reply') => {
    const post = state.post;
    if (!post || state.commentPosting) { return; }
    const replyTo = state.replyTo.comment;
    if (type === 'reply' && !replyTo) { return; }
    const content = type === 'direct'
      ? state.commentInput
      : state.replyTo.content;
    if (!content) {
      snackbarService.show('请输入评论');
      return;
    }
    const comment = await runLoading(
      (l) => { state.commentPosting = l; },
      () => nodeService.comment.submit({
        objectId: post.trxId,
        content,
        ...type === 'reply'
          ? {
            threadId: replyTo!.threadId || replyTo!.trxId,
            replyId: replyTo!.threadId ? replyTo!.trxId : '',
          }
          : {
            threadId: '',
            replyId: '',
          },
      }),
    );
    runInAction(() => {
      state.commentTrxIds.push(comment.trxId);
      if (type === 'direct') {
        state.commentInput = '';
      } else {
        state.replyTo.content = '';
        state.replyTo.open = false;
      }
    });
    setTimeout(() => {
      const commentNode = document.querySelector(`[data-comment-trx-id="${comment.trxId}"]`);
      if (commentNode) {
        scrollIntoView(commentNode, { behavior: 'smooth' });
      }
    });
  };

  const loadComments = async () => {
    const post = state.post;
    if (!post) { return; }
    // TODO: comment paging?
    await runLoading(
      (l) => { state.commentLoading = l; },
      async () => {
        const commentTrxIds = await nodeService.comment.list(post.trxId);
        runInAction(() => {
          state.commentTrxIds = commentTrxIds;
        });
      },
    );
  };

  useEffect(() => {
    const highlightedId = viewService.state.page.page.name === 'postdetail'
      ? viewService.state.page.page.value.commentTrx
      : '';
    const locateComment = viewService.state.page.page.name === 'postdetail'
      && viewService.state.page.page.value.locateComment;

    if (highlightedId) {
      runInAction(() => {
        state.highlightedComments.add(highlightedId);
      });
    }

    loadComments().then(() => {
      if (!highlightedId && locateComment) {
        setTimeout(() => {
          if (commentBox.current) {
            scrollIntoView(commentBox.current, { behavior: 'smooth' });
          }
        }, 0);
      }
    });
  }, []);

  if (!state.post) {
    return (
      <div className="flex justify-center">
        <div className="flex-col items-start w-[800px] bg-black/80 text-white p-8">
          404 帖子不存在

          <Button
            className="mt-4 text-white"
            variant="outlined"
            onClick={() => viewService.back()}
          >
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="relative flex-col w-[800px] mb-12">
        <div className="flex justify-end w-full">
          <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
        </div>
        <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />

        {!!state.post && (
          <PostDetailBox post={state.post} />
        )}

        <div className="flex w-full bg-black/80 p-8 mt-5 gap-x-6">
          <div className="flex flex-1 h-[40px] items-stretch">
            <InputBase
              className="bg-white flex-1 rounded-l text-black px-4 text-14"
              placeholder="在这里写下你的评论…"
              value={state.commentInput}
              onChange={action((e) => { state.commentInput = e.target.value; })}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handlePostComment('direct');
                }
              }}
            />
            <Tooltip title={nodeService.state.logined ? '' : '请先登录'}>
              <div className="flex self-stretch">
                <LoadingButton
                  className="rounded-l-none"
                  color="rum"
                  variant="contained"
                  onClick={() => handlePostComment('direct')}
                  disabled={!nodeService.state.logined}
                  loading={state.commentPosting}
                >
                  发布评论
                </LoadingButton>
              </div>
            </Tooltip>
          </div>
          <UserAvatar size={40} profile={nodeService.state.myProfile} />
        </div>

        <div
          className="flex-col bg-black/80 mt-5 gap-x-6"
          ref={commentBox}
        >
          <div className="flex justify-between items-center border-white/20 border-b px-12 py-4">
            <div className="text-14">
              <button
                className={classNames(
                  state.commentSort === 'latest' && 'text-rum-orange',
                  state.commentSort !== 'latest' && 'text-white',
                )}
                onClick={action(() => { state.commentSort = 'latest'; })}
              >
                最新在前
              </button>
              <span className="text-gray-70 mx-2">
                |
              </span>
              <button
                className={classNames(
                  state.commentSort === 'oldest' && 'text-rum-orange',
                  state.commentSort !== 'oldest' && 'text-white',
                )}
                onClick={action(() => { state.commentSort = 'oldest'; })}
              >
                最早在前
              </button>
            </div>
            <div className="flex flex-center text-white text-14">
              <CommentMinusIcon className="mr-2 -mb-[3px] text-20" />
              {state.comments.length} 条评论
            </div>
          </div>

          <div className="relative flex-col pt-4 pb-8">
            <div className="flex-col px-12 divide-y divide-white/20">
              {state.commentLoading && (
                <div className="flex flex-center pt-8 pb-4">
                  <CircularProgress className="text-white/70" />
                </div>
              )}
              {!state.commentLoading && !state.sortedCommentTree.length && (
                <div className="flex flex-center text-white/80 text-14 py-6 pb-4">
                  暂无评论
                </div>
              )}
              {state.sortedCommentTree.map((v) => (
                <CommentItem
                  key={v.trxId}
                  comment={v}
                  onOpenUserCard={handleOpenUserCard}
                  onReply={handleReply}
                  weakMap={state.commentChildrenWeakMap}
                  highlightedComments={state.highlightedComments}
                />
              ))}
            </div>

            {state.userCards.map((v) => (
              <ClickAwayListener
                onClickAway={() => handleRemoveUserCard(v)}
                key={v.id}
              >
                <Fade in={v.in}>
                  <div
                    className="absolute right-0 -mr-5 translate-x-full w-[280px]"
                    style={{ top: `${v.top}px` }}
                  >
                    <UserCard profile={v.profile} />
                  </div>
                </Fade>
              </ClickAwayListener>
            ))}
          </div>

        </div>

        <div className="flex justify-end">
          <Fade in={!!state.replyTo.open} mountOnEnter>
            <div
              className={classNames(
                'fixed bottom-40 translate-x-full -mr-5 p-4',
                'flex-col gap-y-3 w-[280px] bg-black/80 shadow-4 rounded-lg',
              )}
            >
              <div className="text-white text-14">
                正在回复{' '}
                <span className="text-rum-orange">
                  @{state.replyToProfile.name || state.replyToProfile.userAddress.slice(0, 10)}
                </span>
              </div>
              <IconButton
                className="absolute right-[10px] top-[10px]"
                size="small"
                onClick={action(() => { state.replyTo.open = false; })}
              >
                <Close className="text-white/80 text-20" />
              </IconButton>
              <textarea
                className={classNames(
                  'mt-1 text-14 h-[144px] text-white px-3 py-2 bg-transparent resize-none rounded',
                  'outline-none border border-white/20 hover:border-white/80',
                  'focus:border-white focus:border-2 focus:px-[11px] focus:py-[7px]',
                )}
                ref={replyTextarea}
                value={state.replyTo.content}
                onKeyDown={action((e) => {
                  if (e.key === 'Escape') {
                    state.replyTo.open = false;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handlePostComment('reply');
                  }
                })}
                onChange={action((e) => { state.replyTo.content = e.target.value; })}
              />
              <div className="flex justify-between">
                <Button
                  className="text-gray-9c py-1"
                  color="inherit"
                  variant="text"
                  onClick={action(() => { state.replyTo.open = false; })}
                  disabled={state.commentPosting}
                >
                  关闭回复框
                </Button>
                <LoadingButton
                  className=" py-1"
                  color="rum"
                  variant="outlined"
                  size="small"
                  onClick={() => handlePostComment('reply')}
                  loading={state.commentPosting}
                >
                  发表回复
                </LoadingButton>
              </div>
            </div>
          </Fade>
        </div>
      </div>

      <div className="w-[280px]">
        <UserCard className="mt-5" profile={state.profile} />
      </div>
    </div>
  );
});

interface CommentItemProps {
  className?: string
  comment: Comment
  topComment?: Comment
  onOpenUserCard: (e: React.MouseEvent, v: Comment) => unknown
  onReply: (e: React.MouseEvent, v: Comment) => unknown
  weakMap: WeakMap<Comment, Array<string>>
  highlightedComments: Set<string>
}

const CommentItem = observer((props: CommentItemProps) => {
  const state = useLocalObservable(() => ({
    expand: true,
    get highlight() {
      return props.highlightedComments.has(props.comment.trxId);
    },
    get needToHighlight() {
      const highlightedId = viewService.state.page.page.name === 'postdetail'
        ? viewService.state.page.page.value.commentTrx
        : '';
      return highlightedId === props.comment.trxId;
    },
    get replyTo() {
      if (!props.comment.replyId) { return null; }
      const commentRepliedTo = nodeService.state.comment.map.get(props.comment.replyId);
      if (!commentRepliedTo) { return null; }
      const commentRepliedToProfile = nodeService.profile.getComputedProfile(
        commentRepliedTo.extra?.userProfile ?? commentRepliedTo.userAddress ?? '',
      );
      return commentRepliedToProfile.name || commentRepliedToProfile.userAddress.slice(0, 10);
    },
    get profile() {
      return nodeService.profile.getComputedProfile(
        props.comment?.extra?.userProfile ?? props.comment?.userAddress ?? '',
      );
    },
  }));
  const rootBox = useRef<HTMLDivElement>(null);

  const handleClearHighlight = action(() => {
    if (state.highlight) {
      props.highlightedComments.delete(props.comment.trxId);
    }
  });

  const handleJumpToRepliedComment = action(() => {
    const node = document.querySelector(`[data-comment-trx-id="${props.comment.replyId}"]`);
    props.highlightedComments.add(props.comment.replyId);
    if (node) {
      scrollIntoView(node, {
        behavior: 'smooth',
      });
    }
  });

  const subComments = (props.weakMap.get(props.comment) ?? [])
    .map((v) => nodeService.state.comment.map.get(v)!);

  useEffect(action(() => {
    if (state.highlight) {
      setTimeout(() => {
        if (rootBox.current) {
          scrollIntoView(rootBox.current, {
            behavior: 'smooth',
          });
        }
      });
    }
  }), []);

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
      data-comment-trx-id={props.comment.trxId}
    >
      <div
        className={classNames(
          'py-4 group duration-200',
          state.highlight && 'bg-blue-400/20',
        )}
      >
        <div className="flex justify-between">
          <div className="flex items-center gap-x-4">
            <UserAvatar profile={state.profile} size={28} />
            <div className="">
              <button
                className="text-16 text-rum-orange mr-4"
                onClick={(e) => props.onOpenUserCard(e, props.comment)}
              >
                {state.profile?.name || state.profile?.userAddress.slice(0, 10)}
              </button>
              <Tooltip title={format(props.comment.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                <span className="text-12 text-gray-af mr-4">
                  {ago(props.comment.timestamp)}
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
                onClick={() => props.comment.storage === 'chain' && showTrxDetail(props.comment.trxId)}
              >
                {props.comment.storage === 'cache' ? '同步中' : '已同步'}
              </button>
            </div>
          </div>
          <div className="flex gap-x-2 h-[34px] items-center">
            {false && (
              <Button
                className="text-link-soft text-14 font-normal hidden group-hover:flex"
                variant="text"
                color="inherit"
                size="small"
              >
                <WineIcon className="mr-1 -mt-[2px] text-16" />
                给TA买一杯
              </Button>
            )}
            {nodeService.state.logined && (
              <Button
                className="text-link-soft text-14 font-normal"
                variant="text"
                color="inherit"
                size="small"
                onClick={(e) => props.onReply(e, props.comment)}
              >
                <ReplyIcon className="mr-1 -mt-[2px] text-24" />
                回复
              </Button>
            )}
          </div>
        </div>

        <div className="text-white text-14 mt-2">
          {props.comment.content}
        </div>
      </div>

      {!!subComments.length && (
        <div className="border-l !border-l-cyan-blue">
          <CommentItem
            className="pl-5 border-t border-t-white/20"
            key={subComments[0].trxId}
            comment={subComments[0]}
            topComment={props.topComment || props.comment}
            onOpenUserCard={props.onOpenUserCard}
            onReply={(e) => props.onReply(e, subComments[0])}
            weakMap={props.weakMap}
            highlightedComments={props.highlightedComments}
          />
          <Foldable fold={!state.expand}>
            {subComments.slice(1).map((v) => (
              <CommentItem
                className="pl-5 border-t border-t-white/20"
                key={v.trxId}
                comment={v}
                topComment={props.topComment || props.comment}
                onOpenUserCard={props.onOpenUserCard}
                onReply={(e) => props.onReply(e, v)}
                weakMap={props.weakMap}
                highlightedComments={props.highlightedComments}
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
