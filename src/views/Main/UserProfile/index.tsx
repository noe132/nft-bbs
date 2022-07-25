import { useEffect } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import store from 'store2';
import RemoveMarkdown from 'remove-markdown';
import { Button, ClickAwayListener, Tooltip } from '@mui/material';
import { ThumbDownOffAlt, ThumbUpOffAlt } from '@mui/icons-material';

import CommentDetailIcon from 'boxicons/svg/regular/bx-comment-detail.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit-alt.svg?fill-icon';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';

import { ScrollToTopButton, BackButton, UserAvatar } from '~/components';
import { nodeService, viewService } from '~/service';
import { CounterName, IPost, IProfile } from '~/database';
import { ago, runLoading } from '~/utils';
import { format } from 'date-fns';

export const UserProfile = observer((props: { className?: string }) => {
  const state = useLocalObservable(() => ({
    content: '',
    showTopButton: false,
    nftTradeTooltip: false,
    likeLoading: false,
    posts: [] as Array<IPost>,
    loading: true,
    get nfts() {
      const list = Array(4).fill(0).map((_, i) => i);
      return Array(Math.ceil(list.length / 2)).fill(0).map((_, i) => list.slice(i * 2, i * 2 + 2));
    },
    get profile() {
      return viewService.state.page[1] as IProfile;
    },
    get selfProfile() {
      return this.profile.userAddress === store('address');
    },
  }));

  const handleOpenPost = (post: IPost) => {
    viewService.pushPage('postdetail', post);
  };

  const handleUpdatePostCounter = (post: IPost, type: CounterName) => {
    if (state.likeLoading) { return; }
    runLoading(
      (l) => { state.likeLoading = l; },
      () => nodeService.updateCounter({
        type: 'post',
        item: post,
        counterName: type,
      }),
    );
  };

  const loadPosts = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const posts = await nodeService.post.getPosts(state.profile.userAddress);
        runInAction(() => {
          state.posts = posts;
        });
      },
    );
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="relative flex-col w-[800px]">
        <div className="flex justify-end w-full">
          <ScrollToTopButton className="fixed bottom-8 -mr-8 translate-x-full" />
        </div>
        <BackButton className="fixed top-[60px] mt-6 -ml-5 -translate-x-full" />
        <div
          className={classNames(
            'flex-col relative w-full mt-6 ',
            state.selfProfile && 'bg-white shadow-4 text-black',
            !state.selfProfile && 'bg-black/70 text-white',
          )}
        >
          {state.selfProfile && (
            <Button
              className="absolute right-3 top-2 px-2"
              color="link"
              variant="text"
              size="small"
            >
              <EditIcon className="text-18 -mt-px mr-1" />
              修改身份资料
            </Button>
          )}
          <div className="flex gap-x-4 p-5">
            <div className="mt-1">
              <UserAvatar profile={state.profile} size={48} />
            </div>
            <div className="flex-col justify-center flex-1 gap-y-1">
              <div className="flex text-20 pr-30">
                <div className="flex-1 w-0 truncate">
                  {state.profile.name}
                </div>
              </div>
              {!!state.profile.intro && (
                <div className="text-14 text-gray-9c truncate-2">
                  {state.profile.intro}
                </div>
              )}
            </div>
            {!state.selfProfile && (
              <div className="flex flex-center flex-none">
                <Button
                  className="rounded-full text-16 px-4 self-center"
                  variant="outlined"
                  color="rum"
                >
                  <WineIcon className="text-20 mr-2 mb-px" />
                  给TA买一杯
                </Button>
              </div>
            )}
          </div>
          <div
            className={classNames(
              'flex-col justify-center border-t mx-5 h-[48px]',
              state.selfProfile && 'border-black/25',
              !state.selfProfile && 'border-white/30',
            )}
          >
            <div className="ml-16 text-14">
              {/* TODO: */}
              加入于 2022年1月 · 共发表 42 帖
            </div>
          </div>
        </div>

        <div className="w-[800px] bg-black/70 flex-col gap-y-12 py-10 px-16 mt-6">
          {/* TODO: get user posts */}
          {state.posts.map((v) => (
            <div key={v.trxId}>
              <div
                className="text-white text-16 font-medium cursor-pointer leading-relaxed truncate-2 hover:underline"
                onClick={() => handleOpenPost(v)}
              >
                {v.title || '无标题'}
              </div>
              <div className="text-blue-gray text-14 truncate-2 mt-2">
                {RemoveMarkdown(v.content)}
              </div>
              <div className="flex items-center justify-between mt-3 text-link-soft text-14">
                <div className="flex gap-x-6 -ml-2">
                  <Button
                    className="text-link-soft text-14 px-2 min-w-0"
                    variant="text"
                    size="small"
                    onClick={() => handleUpdatePostCounter(v, CounterName.postLike)}
                  >
                    <ThumbUpOffAlt className="mr-2 text-18" />
                    {v.summary.likeCount || '点赞'}
                  </Button>
                  <Button
                    className="text-link-soft text-14 px-2 min-w-0"
                    variant="text"
                    size="small"
                    onClick={() => handleUpdatePostCounter(v, CounterName.postDislike)}
                  >
                    <ThumbDownOffAlt className="mr-2 text-18" />
                    {v.summary.dislikeCount || '点踩'}
                  </Button>
                  <Button
                    className="text-link-soft text-14 px-2 min-w-0"
                    variant="text"
                    size="small"
                    onClick={() => handleOpenPost(v)}
                  >
                    <CommentDetailIcon className="mr-2 -mb-px text-18" />
                    {v.summary.commentCount || '我来写第一个评论'}
                  </Button>
                </div>
                <Tooltip title={format(v.timestamp, 'yyyy-MM-dd HH:mm:ss')}>
                  <div className="text-12">
                    {ago(v.timestamp)}
                  </div>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-[280px]">
        <div
          className={classNames(
            'flex-col relative py-5 px-5 mt-6 rounded',
            state.selfProfile && 'bg-white shadow-4 text-black',
            !state.selfProfile && 'bg-black/70 text-white',
          )}
        >
          <div
            className={classNames(
              'text-center',
              state.selfProfile && 'text-dark-blue',
              !state.selfProfile && 'text-gray-9c',
            )}
          >
            我持有的 NFT
          </div>
          <div className="flex-col gap-y-4 mt-4">
            {state.nfts.map((row, i) => (
              <div
                className="flex gap-x-4 flex-center"
                key={i}
              >
                {row.map((_, j) => (
                  <div
                    className="flex w-22 h-22 p-1 border border-black/15"
                    key={j}
                  >
                    <div className="flex-1 self-stretch bg-red-100" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          {state.selfProfile && (
            <div className="text-center mt-4">
              <ClickAwayListener onClickAway={action(() => { state.nftTradeTooltip = false; })}>
                <Tooltip
                  PopperProps={{ disablePortal: true }}
                  onClose={action(() => { state.nftTradeTooltip = false; })}
                  open={state.nftTradeTooltip}
                  disableFocusListener
                  disableHoverListener
                  disableTouchListener
                  title="功能开发中"
                >
                  <button
                    className="text-link text-14"
                    onClick={action(() => { state.nftTradeTooltip = true; })}
                  >
                    NFT 交易或转让
                  </button>
                </Tooltip>
              </ClickAwayListener>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
