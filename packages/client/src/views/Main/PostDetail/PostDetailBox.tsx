import React from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Share, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';
import type { Post } from 'nft-bbs-server';
import TrashIcon from 'boxicons/svg/regular/bx-trash.svg?fill-icon';

import { ago, renderPostMarkdown, runLoading, setClipboard } from '~/utils';
import { imageZoomService, nodeService, snackbarService, keyService, dialogService, nftService } from '~/service';
import { UserAvatar, PostImageZoomButton } from '~/components';
import { ImageApi } from '~/apis';
import { showTrxDetail } from '~/modals';

export const PostDetailBox = observer((props: { className?: string, post: Post }) => {
  const navigate = useNavigate();
  const state = useLocalObservable(() => ({
    likeLoading: false,
    get content() {
      const groupId = props.post.groupId;
      const matches = Array.from(this.postStat.content.matchAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g));
      const images = new Map<string, string>(
        matches.map((_sub, _g1, g2) => [g2 as any as string, '']),
      );
      matches.forEach((match) => {
        const [_sub, _g1, trxId] = match;
        if (nodeService.state.post.imageCache.has(trxId)) {
          images.set(trxId, nodeService.state.post.imageCache.get(trxId)!);
          return;
        }
        const url = ImageApi.getImageUrl(groupId, trxId);
        images.set(trxId, url);
      });
      const content = this.postStat.content.replaceAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g, (_sub, g1, trxId) => {
        const imgUrl = images.get(trxId);
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
      return !nodeService.state.post.newPostCache.has(props.post.trxId);
    },
  }));

  const handlePostClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLImageElement) {
      imageZoomService.openImage(e.target);
    }
  };

  const handleUpdatePostCounter = (type: 'Like' | 'Dislike') => {
    if (!nftService.hasPermissionAndTip('counter')) { return; }
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.updatePost(props.post, type),
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
    if (!nftService.hasPermissionAndTip('post')) { return; }
    const result = await dialogService.open({
      title: '删除帖子',
      content: '确定要删除这个帖子吗？',
      danger: true,
    });
    if (result === 'confirm') {
      nodeService.post.delete(props.post);
      navigate(`/${nodeService.state.groupId}`);
      dialogService.open({
        title: '删除成功',
        content: '帖子将会在数据同步后删除。',
        cancel: null,
      });
    }
  };

  const handleShare = () => {
    setClipboard(window.location.href);
    snackbarService.show('帖子地址已复制到剪切板');
  };

  return (
    <div
      className={classNames(
        'flex-col w-full bg-black/80',
        props.className,
      )}
    >
      <div className="flex mx-16 mt-10 gap-x-2">
        <div className="flex flex-1 text-20 text-white truncate-2">
          {state.postStat.title || '无标题'}
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
            <Tooltip title="删除帖子">
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
      <div className="flex items-center gap-x-4 mt-6 mx-16">
        <UserAvatar
          className="cursor-pointer"
          profile={state.profile}
          onClick={() => state.profile && navigate(`/${state.profile.groupId}/userprofile/${state.profile.userAddress}`)}
        />
        <div
          className="text-14 text-rum-orange cursor-pointer"
          onClick={() => state.profile && navigate(`/${state.profile.groupId}/userprofile/${state.profile.userAddress}`)}
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
          onClick={() => state.synced && showTrxDetail(props.post.trxId)}
        >
          {state.synced ? '已同步' : '同步中'}
        </button>
      </div>

      <div className="relative">
        <PostImageZoomButton className="text-24 -mt-2 ml-2 text-white" />
        <div
          className="post-detail-box text-white mx-16 pt-2"
          dangerouslySetInnerHTML={{ __html: state.content }}
          onClick={handlePostClick}
        />
      </div>

      <div className="flex justify-between border-dark-blue border-t mt-4 px-14 py-4">
        <div className="flex gap-x-2">
          <Button
            className={classNames(
              'min-w-0 px-2',
              !state.postStat.liked && 'text-link-soft',
              state.postStat.liked && 'text-rum-orange',
            )}
            variant="text"
            onClick={() => handleUpdatePostCounter('Like')}
          >
            {!state.postStat.likeCount && (
              <ThumbUpOffAlt className="mr-2 text-22" />
            )}
            {!!state.postStat.likeCount && (
              <ThumbUpAlt className="mr-2 text-22" />
            )}
            {state.postStat.likeCount || '赞'}
          </Button>
          <Button
            className={classNames(
              'min-w-0 px-2',
              !state.postStat.disliked && 'text-link-soft',
              state.postStat.disliked && 'text-rum-orange',
            )}
            variant="text"
            onClick={() => handleUpdatePostCounter('Dislike')}
          >
            {!state.postStat.dislikeCount && (
              <ThumbDownOffAlt className="mr-2 text-22" />
            )}
            {!!state.postStat.dislikeCount && (
              <ThumbDownAlt className="mr-2 text-22" />
            )}
            {state.postStat.dislikeCount || '踩'}
          </Button>
        </div>

        <Button
          className="text-link-soft"
          variant="text"
          onClick={handleShare}
        >
          <Share className="mr-2 text-22" />分享
        </Button>
      </div>
    </div>
  );
});
