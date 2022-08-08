import classNames from 'classnames';
import { Button } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';
import { viewService } from '~/service';
import { CommentModel, IProfile, PostModel } from '~/database';
import { UserAvatar } from '~/components';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useEffect } from 'react';
import { runInAction } from 'mobx';
import { format } from 'date-fns';

interface Props {
  className?: string
  profile?: IProfile | null
}

export const UserCard = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    fistPostTime: 0,
    totalPosts: 0,
  }));

  const loadUserData = async () => {
    const userAddress = props.profile?.userAddress;
    if (!userAddress) { return; }
    const [posts, comment] = await Promise.all([
      PostModel.getByUser(userAddress),
      CommentModel.getUserFirstComment(userAddress),
    ]);
    posts.sort((a, b) => a.timestamp - b.timestamp);
    const post = posts.at(0);
    const timestamp = Math.min(post?.timestamp ?? 0, comment?.timestamp ?? 0);
    if (timestamp) {
      runInAction(() => {
        state.fistPostTime = timestamp;
        state.totalPosts = posts.length;
      });
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <div className={classNames('flex-col relative bg-black/70 py-5 px-5', props.className)}>
      <div
        className="flex items-center self-stretch cursor-pointer"
        onClick={() => props.profile && viewService.pushPage('userprofile', props.profile)}
      >
        <UserAvatar className="mr-3" profile={props.profile} size={48} />
        <div className="text-rum-orange text-16 flex-1">
          {props.profile?.name || props.profile?.userAddress.slice(0, 10)}
        </div>
        <ChevronRight className="text-link-soft text-26 -mr-2" />
      </div>
      <div className="text-gray-9c text-14 mt-3">
        {props.profile?.intro}
      </div>
      <div className="border-t border-white/45 mt-4 w-full" />
      <div className="mt-4 text-white text-14">
        {!!state.fistPostTime && `加入于 ${format(state.fistPostTime, 'yyyy-MM')}`}
        {!!state.fistPostTime && ' · '}
        共发表 {state.totalPosts} 帖
      </div>
      {false && (
        <Button
          className="rounded-full text-16 px-5 py-1 mt-6 self-center"
          variant="outlined"
          color="rum"
        >
          <WineIcon className="text-22 mr-3 mb-px" />
          给TA买一杯
        </Button>
      )}
    </div>
  );
});
