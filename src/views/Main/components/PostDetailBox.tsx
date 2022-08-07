import React, { useEffect } from 'react';
import classNames from 'classnames';
import { runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format } from 'date-fns';
import { Button, Tooltip } from '@mui/material';
import { Share, ThumbDownAlt, ThumbDownOffAlt, ThumbUpAlt, ThumbUpOffAlt } from '@mui/icons-material';

import { ago, renderPostMarkdown, runLoading } from '~/utils';
import { imageZoomService, viewService, nodeService, snackbarService } from '~/service';
import { CounterName, ImageModel, IPost } from '~/database';
import { UserAvatar, PostImageZoomButton } from '~/components';

export const PostDetailBox = observer((props: { className?: string, post: IPost }) => {
  const state = useLocalObservable(() => ({
    content: '',
    likeLoading: false,
    images: new Map<string, string>(
      Array.from(
        props.post.content.matchAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g),
      ).map((_sub, _g1, g2) => [g2 as any as string, '']),
    ),
  }));

  const handlePostClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLImageElement) {
      imageZoomService.openImage(e.target);
    }
  };

  const handleUpdatePostCounter = (type: CounterName) => {
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.counter.update({
        type: 'post',
        item: props.post,
        counterName: type,
      }),
    );
  };

  const parseContent = async () => {
    const matches = props.post.content.matchAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g);
    await Promise.all(
      Array.from(matches).map(async (match) => {
        const [_sub, _g1, trxId] = match;
        const item = await ImageModel.get(trxId);
        runInAction(() => {
          if (item?.content) {
            try {
              state.images.set(trxId, URL.createObjectURL(item.content));
            } catch (e) {}
          }
        });
      }),
    );
    const content = props.post.content.replaceAll(/(!\[.*?\])\(rum:\/\/objects\/(.+?)\)/g, (_sub, g1, trxId) => {
      const imgUrl = state.images.get(trxId);
      return `${g1}(${imgUrl})`;
    });
    runInAction(() => {
      state.content = renderPostMarkdown(content);
    });
  };

  useEffect(() => {
    parseContent();
  }, [props.post.content]);

  useEffect(() => () => {
    state.images.forEach((v) => URL.revokeObjectURL(v));
  }, []);

  return (
    <div
      className={classNames(
        'flex-col w-full bg-black/70',
        props.className,
      )}
    >
      <div className="text-20 text-white mx-16 mt-10">
        {props.post.title || '无标题'}
      </div>
      <div className="flex items-center gap-x-4 mt-6 mx-16">
        <UserAvatar profile={props.post.extra?.userProfile} />
        <div
          className="text-14 text-rum-orange cursor-pointer"
          onClick={() => props.post.extra?.userProfile && viewService.pushPage('userprofile', props.post.extra.userProfile)}
        >
          {props.post.extra?.userProfile?.name || props.post.extra?.userProfile?.userAddress.slice(0, 10)}
        </div>
        <Tooltip title={format(props.post.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
          <div className="text-12 text-gray-a7">
            {ago(props.post.timestamp)}
          </div>
        </Tooltip>
      </div>

      <div className="relative">
        <PostImageZoomButton className="text-24 -mt-2 ml-2 text-white" />
        <div
          className="post-detail-box text-white mx-16"
          dangerouslySetInnerHTML={{ __html: state.content }}
          onClick={handlePostClick}
        />
      </div>

      <div className="flex justify-between border-dark-blue border-t mt-4 px-14 py-4">
        <div className="flex gap-x-2">
          <Button
            className={classNames(
              'min-w-0',
              !props.post.extra?.liked && 'text-link-soft',
              props.post.extra?.liked && 'text-rum-orange',
            )}
            variant="text"
            onClick={() => handleUpdatePostCounter(CounterName.postLike)}
          >
            {!props.post.summary.likeCount && (
              <ThumbUpOffAlt className="mr-2 text-22" />
            )}
            {!!props.post.summary.likeCount && (
              <ThumbUpAlt className="mr-2 text-22" />
            )}
            {props.post.summary.likeCount || '点赞'}
          </Button>
          <Button
            className={classNames(
              'min-w-0',
              !props.post.extra?.disliked && 'text-link-soft',
              props.post.extra?.disliked && 'text-rum-orange',
            )}
            variant="text"
            onClick={() => handleUpdatePostCounter(CounterName.postDislike)}
          >
            {!props.post.summary.dislikeCount && (
              <ThumbDownOffAlt className="mr-2 text-22" />
            )}
            {!!props.post.summary.dislikeCount && (
              <ThumbDownAlt className="mr-2 text-22" />
            )}
            {props.post.summary.dislikeCount || '点踩'}
          </Button>
        </div>

        <Button
          className="text-link-soft"
          variant="text"
          onClick={() => snackbarService.show('TODO')}
        >
          <Share className="mr-2 text-22" />分享
        </Button>
      </div>
    </div>
  );
});
