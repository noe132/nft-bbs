import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { action, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import scrollIntoView from 'scroll-into-view-if-needed';
import type { Comment, Profile } from 'nft-bbs-server';
import { Button, CircularProgress, ClickAwayListener, Fade, IconButton, InputBase, Portal, Tooltip } from '@mui/material';
import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import CommentMinusIcon from 'boxicons/svg/regular/bx-comment-minus.svg?fill-icon';

import { BackButton, Scrollable, ScrollToTopButton, UserAvatar, UserCard } from '~/components';
import { nftService, nodeService, routerService, snackbarService } from '~/service';
import { lang, runLoading, usePageState, useWiderThan } from '~/utils';

import { PostDetailBox } from './PostDetailBox';
import { CommentBox } from './CommentBox';
import { commentContext } from './CommentBox/context';

interface UserCardItem {
  el: HTMLElement
  id: number
  top: number
  in: boolean
  profile?: Profile | null
}

const COMMENT_LENGTH_LIMIT = 500;
export const PostDetail = observer((props: { className?: string }) => {
  const routeParams = useParams<{ groupId: string, trxId: string }>();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();
  const state = usePageState('postdetail', routeLocation.key, () => ({
    inited: false,
    postLoading: false,
    commentTrxIds: [] as Array<string>,
    replyTo: {
      open: false,
      comment: null as null | Comment,
      content: '',
      inputFocused: false,
    },
    userCardId: 0,
    userCards: [] as Array<UserCardItem>,
    commentLoading: false,
    commentSort: 'latest' as 'latest' | 'oldest',
    commentInput: '',
    commentInputFocused: false,
    commentPosting: false,
    commentContextState: {
      initCommentTrx: '',
      newCommentTrxId: '',
      highlightedComments: new Set<string>(),
      weakMap: new WeakMap<Comment, Array<string>>(),
    },
    get post() {
      return nodeService.state.post.map.get(routeParams.trxId ?? '');
    },
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
            const children = this.commentContextState.weakMap.get(parent) ?? [];
            if (!children.includes(comment.trxId)) {
              children.push(comment.trxId);
            }
            this.commentContextState.weakMap.set(parent, children);
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
  const isPC = useWiderThan(960);

  const commentBox = useRef<HTMLDivElement>(null);
  const mobileCommentInput = useRef<HTMLTextAreaElement>(null);
  const replyTextarea = useRef<HTMLTextAreaElement>(null);
  const mobileReplyTextarea = useRef<HTMLTextAreaElement>(null);

  const handleOpenUserCard = action((v: Comment, commentBox: HTMLElement) => {
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

  const handleReply = action((v: Comment) => {
    if (!nftService.hasPermissionAndTip('comment')) { return; }
    state.replyTo = {
      ...state.replyTo,
      comment: v,
      open: true,
    };
    setTimeout(() => {
      if (isPC) {
        replyTextarea.current?.focus();
      } else {
        mobileReplyTextarea.current?.focus();
      }
    });
  });

  const handlePostComment = async (type: 'direct' | 'reply') => {
    if (!nftService.hasPermissionAndTip('comment')) { return; }
    const post = state.post;
    if (!post || state.commentPosting) { return; }
    const replyTo = state.replyTo.comment;
    if (type === 'reply' && !replyTo) { return; }
    const content = type === 'direct'
      ? state.commentInput
      : state.replyTo.content;
    if (!content) {
      snackbarService.show(lang.comment.emptyCommentTip);
      return;
    }
    if (content.length > COMMENT_LENGTH_LIMIT) {
      snackbarService.show(lang.comment.maxLengthTip(COMMENT_LENGTH_LIMIT));
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
    if (comment) {
      runInAction(() => {
        state.commentTrxIds.push(comment.trxId);
        if (type === 'direct') {
          state.commentInput = '';
        } else {
          state.replyTo.content = '';
          state.replyTo.open = false;
        }
        state.commentContextState.newCommentTrxId = comment.trxId;
      });
    }
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
            scrollIntoView(commentBox.current, { behavior: 'smooth', block: 'start' });
          }
        }, 0);
      }
    });
  };

  useEffect(() => {
    const dispose = reaction(
      () => state.post?.title,
      (title) => nodeService.group.setDocumentTitle(title),
      { fireImmediately: true },
    );
    if (!state.inited) {
      const highlightedId = searchParams.get('commentTrx');
      runInAction(() => {
        if (highlightedId) {
          state.commentContextState.initCommentTrx = highlightedId;
          state.commentContextState.highlightedComments.add(highlightedId);
        }
        state.inited = true;
      });

      loadData();
    }
    return dispose;
  }, []);

  const commentContextValue = useMemo(() => ({
    state: state.commentContextState,
    onOpenUserCard: handleOpenUserCard,
    onReply: handleReply,
  }), []);

  if (!state.post && !state.postLoading) {
    return (
      <div className="flex justify-center">
        <div className="flex-col items-start w-[800px] bg-black/80 text-white p-8">
          {lang.post.notFound}
          <Button
            className="mt-4 text-white"
            variant="outlined"
            onClick={() => routerService.navigate({ page: 'postlist' })}
          >
            {lang.post.backToPostList}
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
        {isPC && (<>
          <div className="flex justify-end w-full">
            <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full z-10" />
          </div>
          <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />
        </>)}

        {!!state.postLoading && (
          <div className="flex flex-center py-20 bg-black/80">
            <CircularProgress />
          </div>
        )}

        {!!state.post && (
          <PostDetailBox post={state.post} />
        )}

        {isPC && (
          <div
            className={classNames(
              'flex w-full bg-black/80 mt-5 gap-x-6',
              isPC && 'p-8',
              !isPC && 'p-4',
            )}
          >
            <div className="flex flex-1 items-stretch">
              <InputBase
                className={classNames(
                  'flex-1 rounded-l !text-black px-4 text-14 outline-none min-w-0 py-[10px]',
                  nftService.state.permissionMap.comment && 'bg-white',
                  !nftService.state.permissionMap.comment && 'bg-white/20 cursor-not-allowed',
                )}
                classes={{ focused: 'outline outline-rum-orange -outline-offset-2' }}
                placeholder={nftService.permissionTip('comment') || lang.comment.commentInputPlaceholder}
                value={state.commentInput}
                onChange={action((e) => { state.commentInput = e.target.value; })}
                disabled={!nftService.state.permissionMap.comment}
                multiline
                maxRows={5}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handlePostComment('direct');
                  }
                }}
              />
              <Tooltip title={nftService.permissionTip('comment')}>
                <div className="flex self-stretch">
                  <LoadingButton
                    className="rounded-l-none"
                    color="rum"
                    variant="contained"
                    onClick={() => handlePostComment('direct')}
                    disabled={!nftService.state.permissionMap.comment}
                    loading={state.commentPosting}
                  >
                    {lang.comment.postComment}
                  </LoadingButton>
                </div>
              </Tooltip>
            </div>
            {isPC && (
              <UserAvatar size={40} profile={nodeService.state.myProfile} />
            )}
          </div>
        )}

        <div
          className="flex-col mt-5 gap-x-6"
          ref={commentBox}
        >
          <div
            className={classNames(
              'flex justify-between items-center border-white/20 border-b py-4 bg-black/80',
              'sticky top-0 z-10',
              isPC && 'px-12',
              !isPC && 'px-4',
            )}
          >
            <div className="text-14">
              <button
                className={classNames(
                  state.commentSort === 'latest' && 'text-rum-orange',
                  state.commentSort !== 'latest' && 'text-white',
                )}
                onClick={action(() => { state.commentSort = 'latest'; })}
              >
                {lang.comment.sortByLatest}
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
                {lang.comment.sortByOldest}
              </button>
            </div>
            <div className="flex flex-center text-white text-14">
              <CommentMinusIcon className="mr-2 -mb-[3px] text-20" />
              {lang.comment.commentCount(state.commentTrxIds.length)}
            </div>
          </div>

          <div className="relative flex-col pt-4 pb-8 bg-black/80">
            <div
              className={classNames(
                'flex-col divide-y divide-white/20',
                isPC && 'px-12',
                !isPC && 'px-4',
              )}
            >
              {state.commentLoading && (
                <div className="flex flex-center pt-8 pb-4">
                  <CircularProgress className="text-white/70" />
                </div>
              )}
              {!state.commentLoading && !state.sortedCommentTree.length && (
                <div className="flex flex-center text-white/80 text-14 py-6 pb-4">
                  {lang.comment.noComment}
                </div>
              )}
              {!!state.sortedCommentTree.length && (
                <commentContext.Provider value={commentContextValue}>
                  <CommentBox
                    comments={state.sortedCommentTree}
                  />
                </commentContext.Provider>
              )}
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
          {isPC && (
            <Fade in={!!state.replyTo.open} mountOnEnter key={state.replyTo.comment?.trxId ?? ''}>
              <div
                className={classNames(
                  'fixed bottom-40 translate-x-full -mr-5 p-4',
                  'flex-col gap-y-3 w-[280px] bg-black/80 shadow-4 rounded-lg',
                )}
              >
                <div className="text-white text-14">
                  {lang.comment.replyingTo}{' '}
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
                    state.replyTo.content.length > COMMENT_LENGTH_LIMIT && '!border-red-400',
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
                    onClick={action(() => { state.replyTo.content = ''; })}
                    disabled={state.commentPosting}
                  >
                    {lang.comment.clearText}
                  </Button>
                  <LoadingButton
                    className=" py-1"
                    color="rum"
                    variant="outlined"
                    size="small"
                    onClick={() => handlePostComment('reply')}
                    loading={state.commentPosting}
                  >
                    {lang.comment.submit}
                  </LoadingButton>
                </div>
              </div>
            </Fade>
          )}
        </div>
      </div>

      {!isPC && nftService.state.permissionMap.comment && (
        <Portal>
          <div className="flex-col fixed inset-0 z-[50] pointer-events-none">
            <div
              className={
                classNames(
                  'flex flex-center flex-1 duration-150',
                  !state.commentInputFocused && 'pointer-events-none',
                  state.commentInputFocused && 'pointer-events-auto bg-black/50',
                )
              }
            >
              {state.commentPosting && !state.replyTo.open && (
                <CircularProgress className="text-white/80" size={64} />
              )}
            </div>
            <div className="w-full bg-white p-4 pointer-events-auto">
              <InputBase
                className="flex-none bg-black/5 w-full rounded text-black"
                inputProps={{
                  className: 'placeholder:text-black placeholder:opacity-40 px-3 py-1',
                  style: { WebkitTextFillColor: 'unset' },
                }}
                inputRef={mobileCommentInput}
                value={state.commentInput}
                onChange={action((e) => { state.commentInput = e.target.value; })}
                disabled={!nftService.state.permissionMap.comment}
                placeholder={nftService.permissionTip('comment') || lang.comment.commentInputPlaceholder}
                multiline
                maxRows={5}
                onFocus={action(() => { state.commentInputFocused = true; })}
                onBlur={action(() => { state.commentInputFocused = false; })}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    await handlePostComment('direct');
                    mobileCommentInput.current?.blur();
                  }
                }}
              />
            </div>
          </div>
        </Portal>
      )}

      {!isPC && (
        <Portal>
          <div
            className={classNames(
              'flex-col fixed inset-0 z-[60]',
              !state.replyTo.open && 'pointer-events-none',
            )}
          >
            <Fade in={state.replyTo.open}>
              <div
                className={classNames(
                  'flex flex-center flex-1 duration-150',
                  state.replyTo.open && 'bg-black/50',
                )}
                onClick={action(() => { if (!state.commentPosting) { state.replyTo.open = false; } })}
              />
            </Fade>

            <div
              className={classNames(
                'items-stretch bg-[#0d1d37] p-4 gap-y-3 relative',
                state.replyTo.open && 'flex-col',
                !state.replyTo.open && 'hidden',
              )}
            >
              <div className="text-white text-14">
                {lang.comment.replyingTo}{' '}
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
                  state.replyTo.content.length > COMMENT_LENGTH_LIMIT && '!border-red-400',
                )}
                value={state.replyTo.content}
                ref={mobileReplyTextarea}
                onChange={action((e) => { state.replyTo.content = e.target.value; })}
              />
              <div className="flex justify-between">
                <Button
                  className="text-gray-9c py-1"
                  color="inherit"
                  variant="text"
                  onClick={action(() => { state.replyTo.content = ''; })}
                  disabled={state.commentPosting}
                >
                  {lang.comment.clearText}
                </Button>
                <LoadingButton
                  className=" py-1"
                  color="rum"
                  variant="outlined"
                  size="small"
                  onClick={() => handlePostComment('reply')}
                  loading={state.commentPosting}
                >
                  {lang.comment.submit}
                </LoadingButton>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {isPC && (
        <div className="w-[280px]">
          <div
            className="fixed flex-col w-[280px]"
            style={{ maxHeight: 'calc(100vh - 64px)' }}
          >
            <Scrollable className="flex-1 h-0" hideTrack>
              <UserCard className="mt-6" profile={state.profile} />
              <div className="h-[100px] w-full" />
            </Scrollable>
          </div>
        </div>
      )}
    </div>
  );
});
