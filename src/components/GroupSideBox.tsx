import { Button, IconButton, Tooltip } from '@mui/material';
import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';

import { editGroupInfo } from '~/modals/editGroupInfo';
import { nodeService, snackbarService, viewService } from '~/service';

import { GroupAvatar } from './GroupAvatar';

interface Props {
  className?: string
  showNewPost?: boolean
}

export const GroupSideBox = observer((props: Props) => {
  const handleNewPost = () => {
    if (!nodeService.state.logined) {
      snackbarService.show('请先登录');
      return;
    }
    viewService.pushPage('newpost');
  };

  return (
    <div
      className={classNames(
        'flex-col justify-center items-stretch relative bg-black/70 py-8',
        props.className,
      )}
    >
      <div className="overflow-hidden absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
        <IconButton
          className="p-0 group text-white"
          onClick={editGroupInfo}
        >
          <GroupAvatar className="flex cursor-pointer border border-white/80 overflow-hidden" size={100} />
          <div className="absolute inset-0 flex-center bg-white/10 hidden rounded-full group-hover:flex">
            <EditIcon className="text-30 text-white/70" />
          </div>
        </IconButton>
      </div>
      <div className="text-white text-center text-18 mt-16">
        {nodeService.state.groupName}
      </div>
      {!!nodeService.state.groupInfo.desc && (
        <div className="border-t border-white/60 text-14 text-white mt-5 mx-5 pt-5">
          {nodeService.state.groupInfo.desc}
        </div>
      )}
      {props.showNewPost && (
        <div className="flex flex-center mt-8">
          <Tooltip title={!nodeService.state.logined ? '请先登录' : ''}>
            <Button
              className="rounded-full text-16 px-5 py-[7px]"
              variant="outlined"
              color={nodeService.state.logined ? 'rum' : 'dark-blue'}
              onClick={handleNewPost}
            >
              <EditIcon className="text-22 mr-3 mb-px" />
              发布新帖
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
});
