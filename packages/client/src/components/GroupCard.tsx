import { matchPath, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, IconButton, Tooltip } from '@mui/material';
import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';
import HomeIcon from 'boxicons/svg/regular/bx-home-alt-2.svg?fill-icon';

// import { editGroupInfo } from '~/modals/editGroupInfo';
import { keyService, nftService, nodeService, routerService } from '~/service';
import { routeUrlPatterns, useWiderThan } from '~/utils';

import { GroupAvatar } from './GroupAvatar';

interface Props {
  className?: string
  mobile?: boolean
  showNewPost?: boolean
  showPostlist?: boolean
  onClose?: () => unknown
}

export const GroupCard = observer((props: Props) => {
  const routeLocation = useLocation();
  const state = useLocalObservable(() => ({
    get isGroupOwner() {
      return keyService.state.address === nodeService.state.groupOwnerAddress;
    },
  }));
  const isPC = useWiderThan(960);

  const handleNewPost = () => {
    if (!nftService.hasPermissionAndTip('main')) { return; }
    props.onClose?.();
    routerService.navigate({ page: 'newpost' });
  };

  const handleGotoPostlist = () => {
    props.onClose?.();
    const match = matchPath(routeUrlPatterns.postlist, routeLocation.pathname);
    if (match) { return; }
    routerService.navigate({ page: 'postlist' });
  };

  return (
    <div
      className={classNames(
        'flex-col justify-center items-stretch relative py-8',
        !props.mobile && 'bg-black/80',
        props.mobile && 'bg-black',
        props.className,
      )}
    >
      <div className="overflow-hidden absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
        <IconButton
          className="p-0 group text-white"
          onClick={handleGotoPostlist}
        >
          <GroupAvatar className="flex cursor-pointer border border-white/80 overflow-hidden" size={100} />
        </IconButton>
        {false && (
          <IconButton
            className="p-0 group text-white"
            onClick={handleGotoPostlist}
            disabled={!state.isGroupOwner}
          >
            <GroupAvatar className="flex cursor-pointer border border-white/80 overflow-hidden" size={100} />
            <div className="absolute inset-0 flex-center bg-white/10 hidden rounded-full group-hover:flex">
              <EditIcon className="text-30 text-white/70" />
            </div>
          </IconButton>
        )}
      </div>
      <div
        className="text-white text-center text-18 mt-16"
        onClick={handleGotoPostlist}
      >
        {nodeService.state.groupName}
      </div>
      {!!nodeService.state.groupDesc && (
        <div className="text-14 text-white/70 mt-4 mx-5">
          {nodeService.state.groupDesc}
        </div>
      )}

      <div className="flex-col gap-y-4 mt-8">
        {!isPC && props.showPostlist && (
          <div className="flex flex-center">
            <Tooltip title={nftService.permissionTip('main')}>
              <Button
                className="rounded-full text-16 px-5 py-[7px]"
                variant="outlined"
                color="rum"
                onClick={handleGotoPostlist}
              >
                <HomeIcon className="text-22 mr-3 mb-px" />
                帖子列表
              </Button>
            </Tooltip>
          </div>
        )}
        {props.showNewPost && (
          <div className="flex flex-center">
            <Tooltip title={nftService.permissionTip('main')}>
              <Button
                className="rounded-full text-16 px-5 py-[7px]"
                variant="outlined"
                color={nftService.state.permissionMap.main ? 'rum' : 'dark-blue'}
                onClick={handleNewPost}
              >
                <EditIcon className="text-22 mr-3 mb-px" />
                发布新帖
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
});
