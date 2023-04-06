import React from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip } from '@mui/material';
import { Share, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import type { Counter, Post } from 'rum-port-server';
import TrashIcon from 'boxicons/svg/regular/bx-trash.svg?fill-icon';

import { ago, lang, renderPostMarkdown, runLoading, setClipboard, ThemeLight, useWiderThan } from '~/utils';
import { imageZoomService, nodeService, snackbarService, keyService, dialogService, nftService, routerService } from '~/service';
import { UserAvatar, PostImageZoomButton } from '~/components';
import { ImageApi } from '~/apis';
import { showTrxDetail } from '~/modals';

export const PostDetailBox = observer((props: { className?: string, post: Post }) => {
  const state = useLocalObservable(() => ({
    likeLoading: false,
    append: {
      open: false,
      loading: false,
      content: '',
    },
    get content() {
      const groupId = props.post.groupId;
      const matches = Array.from(this.postStat.content.matchAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g));
      const images = new Map<string, string>(
        matches.map((_sub, _g1, g2) => [g2 as any as string, '']),
      );
      matches.forEach((match) => {
        const [_sub, _g1, id] = match;
        if (nodeService.state.post.imageCache.has(id)) {
          images.set(id, nodeService.state.post.imageCache.get(id)!);
          return;
        }
        const url = ImageApi.getImageUrl(groupId, id);
        images.set(id, url);
      });
      const content = this.postStat.content.replaceAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g, (_sub, g1, id) => {
        const imgUrl = images.get(id);
        return `${g1}(${imgUrl})`;
      });
      return renderPostMarkdown(content);
    },
    get profile() {
      return nodeService.profile.getComputedProfile(
        props.post.extra?.userProfile ?? props.post.extra?.userProfile.userAddress ?? '',
      );
    },
    get postStat() {
      return nodeService.post.getStat(props.post);
    },
    get isPostAuthor() {
      return keyService.state.address === props.post.userAddress;
    },
    get synced() {
      return !nodeService.state.post.newPostCache.has(props.post.id);
    },
  }));
  const isPC = useWiderThan(960);

  const handlePostClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLImageElement) {
      imageZoomService.openImage(e.target);
    }
  };

  const handleUpdatePostCounter = (type: Counter['type']) => {
    if (!nftService.hasPermissionAndTip('counter')) { return; }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.update(props.post, type),
    );
  };

  // const handleEditPost = () => {
  //   if (!nftService.state.hasPermission) {
  //     snackbarService.show('您没有评论互动权限);
  //     return;
  //   }
  //   navigate(stringifyUrl({
  //     url: '/newpost',
  //     query: { edit: props.post.trxId },
  //   }));
  // };

  const handleDeletePost = async () => {
    if (!nftService.hasPermissionAndTip('main')) { return; }
    const result = await dialogService.open({
      title: lang.post.deleteTitle,
      content: lang.post.deleteContent,
      danger: true,
    });
    if (result === 'confirm') {
      nodeService.post.delete(props.post);
      routerService.navigate({ page: 'postlist' });
      dialogService.open({
        title: lang.post.deleteSuccessTitle,
        content: lang.post.deleteSuccessContent,
        cancel: null,
      });
    }
  };

  const handleAppend = () => {
    const content = state.append.content.trim();
    if (!content) {
      return;
    }
    runLoading(
      (l) => { state.append.loading = l; },
      async () => {
        try {
          await nodeService.post.append(content, props.post.id);
          snackbarService.show('已添加附言');
          runInAction(() => {
            state.append.open = false;
            state.append.content = '';
          });
        } catch (e) {}
      },
    );
  };

  const handleCloseAppend = action(() => {
    if (!state.append.loading) {
      state.append.open = false;
    }
  });

  const handleShare = () => {
    setClipboard(window.location.href);
    snackbarService.show(lang.post.urlCopied);
  };

  return (<>
    <div
      className={classNames(
        'flex-col w-full bg-black/80',
        props.className,
      )}
    >
      <div
        className={classNames(
          'flex mt-10 gap-x-2',
          isPC && 'mx-16',
          !isPC && 'mx-4',
        )}
      >
        <div className="flex flex-1 text-20 text-white truncate-2">
          {state.postStat.title || lang.common.untitled}
        </div>
        {state.isPostAuthor && (
          <div className="flex flex-center gap-x-2 flex-none -mr-2">
            {/* <Tooltip title="编辑帖子">
              <IconButton
                className="text-white/70 hover:text-rum-orange"
                onClick={handleEditPost}
              >
                <EditIcon className="text-20" />
              </IconButton>
            </Tooltip> */}
            <Tooltip title={lang.post.deleteButton}>
              <IconButton
                className="text-white/70 hover:text-red-400"
                onClick={handleDeletePost}
              >
                <TrashIcon className="text-20" />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>
      <div
        className={classNames(
          'flex items-center gap-x-4 mt-6',
          isPC && 'mx-16',
          !isPC && 'mx-4',
        )}
      >
        <UserAvatar
          className="cursor-pointer"
          profile={state.profile}
          onClick={() => state.profile && routerService.navigate({ page: 'userprofile', userAddress: state.profile.userAddress })}
        />
        <div
          className="text-14 text-rum-orange cursor-pointer"
          onClick={() => state.profile && routerService.navigate({ page: 'userprofile', userAddress: state.profile.userAddress })}
        >
          {state.profile?.name || state.profile?.userAddress.slice(0, 10)}
        </div>
        <Tooltip title={format(props.post.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
          <div className="text-12 text-gray-a7">
            {ago(props.post.timestamp)}
          </div>
        </Tooltip>
        <button
          className="text-white/35 text-12"
          onClick={() => state.synced && showTrxDetail(props.post.trxId, 'main')}
        >
          {state.synced ? lang.common.synced : lang.common.sycing}
        </button>
      </div>

      <div className="relative">
        <PostImageZoomButton className="text-24 -mt-2 ml-2 text-white" />
        <div
          className={classNames(
            'rendered-markdown text-white pt-2',
            isPC && 'mx-16',
            !isPC && 'mx-4',
          )}
          dangerouslySetInnerHTML={{ __html: state.content }}
          onClick={handlePostClick}
        />
      </div>


      <div
        className={classNames(
          'flex-col mt-4 leading-relaxed divide-y divide-white/20',
          'border-l border-l-[#b4daff]',
          'border-t border-t-white/20',
          !state.isPostAuthor && !props.post.extra?.appends.length && '!hidden',
          isPC && 'mx-8',
          !isPC && 'px-2',
        )}
      >
        {props.post.extra?.appends.map((v, i) => (
          <div className="px-6 py-3" key={v.id}>
            <div className="text-gray-af">
              <span className="text-14">
                附言 {i + 1}
              </span>
              <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                <span className="text-12">
                  · {ago(v.timestamp)}
                </span>
              </Tooltip>
            </div>
            <div className="text-white text-14 mt-1">
              {v.content}
            </div>
          </div>
        ))}
        {state.isPostAuthor && (
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-rum-orange text-14">
              你可以继续补充附言…
            </span>

            <Button
              className="text-14 px-3 py-[2px]"
              variant="outlined"
              color="rum"
              size="small"
              onClick={action(() => { state.append.open = true; })}
            >
              补充附言
            </Button>
          </div>
        )}
      </div>

      <div
        className={classNames(
          'flex justify-between border-dark-blue border-t mt-4 py-4',
          isPC && 'px-14',
          !isPC && 'px-2',
        )}
      >
        <div className="flex gap-x-2">
          <Button
            className={classNames(
              'min-w-0 px-2',
              !state.postStat.liked && 'text-link-soft',
              state.postStat.liked && 'text-rum-orange',
            )}
            variant="text"
            onClick={() => handleUpdatePostCounter(state.postStat.liked ? 'undolike' : 'like')}
          >
            {!state.postStat.likeCount && (
              <ThumbUpOffAlt className="mr-2 text-22" />
            )}
            {!!state.postStat.likeCount && (
              <ThumbUpAlt className="mr-2 text-22" />
            )}
            {state.postStat.likeCount || lang.common.like}
          </Button>
          <Button
            className={classNames(
              'min-w-0 px-2',
              !state.postStat.disliked && 'text-link-soft',
              state.postStat.disliked && 'text-rum-orange',
            )}
            variant="text"
            onClick={() => handleUpdatePostCounter(state.postStat.disliked ? 'undodislike' : 'dislike')}
          >
            {!state.postStat.dislikeCount && (
              <ThumbDownOffAlt className="mr-2 text-22" />
            )}
            {!!state.postStat.dislikeCount && (
              <ThumbDownAlt className="mr-2 text-22" />
            )}
            {state.postStat.dislikeCount || lang.common.dislike}
          </Button>
        </div>

        <Button
          className="text-link-soft"
          variant="text"
          onClick={handleShare}
        >
          <Share className="mr-2 text-22" />{lang.common.share}
        </Button>
      </div>
    </div>
    <ThemeLight>
      <Dialog
        className="flex justify-center items-center"
        PaperProps={{ className: 'w-full max-w-[500px]' }}
        TransitionProps={{ className: 'w-full' }}
        open={state.append.open}
        onClose={handleCloseAppend}
      >
        <DialogTitle className="mt-2 px-8 text-gray-4a">
          添加附言
        </DialogTitle>
        <DialogContent className="px-8 text-16 text-gray-64 overflow-visible">
          <TextField
            className="w-full mx-auto !max-w-none"
            inputProps={{ className: '!max-w-none' }}
            variant="outlined"
            multiline
            minRows={3}
            maxRows={6}
            value={state.append.content}
            onChange={action((e) => { state.append.content = e.target.value; })}
          />
        </DialogContent>
        <DialogActions className="flex justify-end items-center py-3 px-6">
          <Button
            className="block bg-white cursor-pointer min-w-[70px] rounded-full"
            color="inherit"
            onClick={handleCloseAppend}
          >
            取消
          </Button>
          <LoadingButton
            className="min-w-[70px] rounded-full"
            color="link"
            variant="outlined"
            onClick={handleAppend}
            disabled={!state.append.content.trim()}
          >
            补充附言
          </LoadingButton>
        </DialogActions>
        <span className="block pb-2" />
      </Dialog>
    </ThemeLight>
  </>);
});
