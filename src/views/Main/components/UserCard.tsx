import classNames from 'classnames';
import { Button } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import WineIcon from 'boxicons/svg/solid/bxs-wine.svg?fill-icon';
import { viewService } from '~/service';
import { IProfile } from '~/database';
import { UserAvatar } from '~/components';

interface Props {
  className?: string
  profile?: IProfile | null
}

export const UserCard = (props: Props) => (
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
      {/* TODO: */}
      加入于 2022年1月 · 共发表 42 帖
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
