import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, IconButton, Tooltip } from '@mui/material';
import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';

import { editGroupInfo } from '~/modals/editGroupInfo';
import { keyService, nodeService, snackbarService } from '~/service';

import { GroupAvatar } from './GroupAvatar';

interface Props {
  className?: string
  showNewPost?: boolean
}

export const GroupSideBox = observer((props: Props) => {
  const navigate = useNavigate();
  const state = useLocalObservable(() => ({
    get isGroupOwner() {
      return keyService.state.address === nodeService.state.groupOwnerAddress;
    },
  }));

  const handleNewPost = () => {
    if (nodeService.state.postPermissionTip) {
      snackbarService.show(nodeService.state.postPermissionTip);
      return;
    }
    navigate(`/${nodeService.state.groupId}/newpost`);
  };

  return (
    <div
      className={classNames(
        'flex-col justify-center items-stretch relative bg-black/80 py-8',
        props.className,
      )}
    >
      <div className="overflow-hidden absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
        <IconButton
          className="p-0 group text-white"
          onClick={editGroupInfo}
          disabled={!state.isGroupOwner}
        >
          <GroupAvatar className="flex cursor-pointer border border-white/80 overflow-hidden" size={100} />
          <div className="absolute inset-0 flex-center bg-white/10 hidden rounded-full group-hover:flex">
            <EditIcon className="text-30 text-white/70" />
          </div>
        </IconButton>
      </div>
      <div className="text-white text-center text-18 mt-16">
        {nodeService.state.groupName || `${nodeService.state.groupId}`}
      </div>
      {!!nodeService.state.groupInfo.desc && (
        <div className="border-t border-white/60 text-14 text-white mt-5 mx-5 pt-5">
          {nodeService.state.groupInfo.desc}
        </div>
      )}
      {props.showNewPost && (
        <div className="flex flex-center mt-8">
          <Tooltip title={nodeService.state.postPermissionTip}>
            <Button
              className="rounded-full text-16 px-5 py-[7px]"
              variant="outlined"
              color={nodeService.state.postPermissionTip ? 'dark-blue' : 'rum'}
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
