import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Comment, Profile } from 'nft-bbs-server';
import { Button, CircularProgress, ClickAwayListener, Fade, IconButton, InputBase, Tooltip } from '@mui/material';
import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import CommentMinusIcon from 'boxicons/svg/regular/bx-comment-minus.svg?fill-icon';

import { BackButton, ScrollToTopButton, UserAvatar, UserCard } from '~/components';
import { nftService, nodeService, snackbarService } from '~/service';
import { runLoading, usePageState } from '~/utils';

import { PostDetailBox } from '../components/PostDetailBox';
import { commentContext, CommentItem } from './CommentItem';

interface UserCardItem {
  el: HTMLElement
  id: number
  top: number
  in: boolean
  profile?: Profile | null
}

export const PostDetail = observer((props: { className?: string }) => {
  const routeParams = useParams<{ groupId: string, trxId: string }>();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = usePageState('postdetail', routeLocation.key, () => ({
    inited: false,
    postLoading: false,
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
      return nodeService.state.post.map.get(routeParams.trxId ?? '');
    },
    commentChildrenWeakMap: new WeakMap<Comment, Array<string>>(),
    get replyToProfile() {
      return nodeService.profile.getComputedProfile(
        state.replyTo.comment?.extra?.userProfile
          ?? state.replyTo.comment?.userAddress
          ?? '',
      );
    },
    get sortedCommentTree() {
      this.commentTrxIds.forEach((trxId) => {
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
      const commentTree = state.commentTrxIds
        .map((v) => nodeService.state.comment.map.get(v)!)
        .filter((v) => !v.threadId);

      return [...commentTree].sort((a, b) => (
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
    if (!nftService.state.hasPermission) {
      snackbarService.show('无权限发表内容');
      return;
    }
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
    if (nodeService.state.postPermissionTip) {
      snackbarService.show(nodeService.state.postPermissionTip);
      return;
    }
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
    if (content.length > 300) {
      snackbarService.show('请输入少于300字');
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
        if (!commentTrxIds) { return; }
        runInAction(() => {
          state.commentTrxIds = commentTrxIds;
        });
      },
    );
  };

  const loadData = async () => {
    const highlightedId = searchParams.get('commentTrx');
    const locateComment = !!searchParams.get('locateComment');

    if (!state.post) {
      await runLoading(
        (l) => { state.postLoading = l; },
        () => nodeService.post.get(routeParams.trxId ?? ''),
      );
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
  };

  useEffect(() => {
    if (!state.inited) {
      const highlightedId = searchParams.get('commentTrx');
      runInAction(() => {
        if (highlightedId) {
          state.highlightedComments.add(highlightedId);
        }
        state.inited = true;
      });

      loadData();
    }
  }, []);

  const commentContextValue = useMemo(() => ({
    highlightedComments: state.highlightedComments,
    weakMap: state.commentChildrenWeakMap,
  }), []);

  if (!state.post) {
    return (
      <div className="flex justify-center">
        <div className="flex-col items-start w-[800px] bg-black/80 text-white p-8">
          404 帖子不存在

          <Button
            className="mt-4 text-white"
            variant="outlined"
            onClick={() => navigate('/')}
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
            <Tooltip title={nodeService.state.postPermissionTip}>
              <div className="flex self-stretch">
                <LoadingButton
                  className="rounded-l-none"
                  color="rum"
                  variant="contained"
                  onClick={() => handlePostComment('direct')}
                  disabled={!!nodeService.state.postPermissionTip}
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
              {state.commentTrxIds.length} 条评论
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
              <commentContext.Provider value={commentContextValue}>
                {state.sortedCommentTree.map((v) => (
                  <CommentItem
                    key={v.trxId}
                    comment={v}
                    onOpenUserCard={handleOpenUserCard}
                    onReply={handleReply}
                  />
                ))}
              </commentContext.Provider>
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
                  state.replyTo.content.length > 300 && '!border-red-400',
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
        <UserCard className="mt-6" profile={state.profile} />
      </div>
    </div>
  );
});
