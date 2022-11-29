import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { Button, Dialog, FormControl, FormHelperText, IconButton, InputLabel, OutlinedInput } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CamaraIcon from 'boxicons/svg/regular/bx-camera.svg?fill-icon';
import { blobToDataUrl, compressImage, createPromise, ThemeLight } from '~/utils';
import { nodeService } from '~/service';
import { GroupAvatar } from '~/components/GroupAvatar';

import { modalViewState } from './helper/modalViewState';
import { editImage } from './editImage';

export const editGroupInfo = action(() => {
  const p = createPromise();
  modalViewState.push({
    component: EditGroupInfoDialog,
    resolve: p.rs,
  });
  return p.p;
});

interface ModalProps {
  rs: () => unknown
}

const EditGroupInfoDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleClose = action(() => {
    props.rs();
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog open={state.open} onClose={handleClose}>
        <div className="flex-col relative w-[400px]">
          <IconButton className="absolute top-2 right-2" onClick={handleClose}>
            <Close />
          </IconButton>
          <EditGroupInfoView onClose={handleClose} />
        </div>
      </Dialog>
    </ThemeLight>
  );
});

interface Props {
  className?: string
  onClose?: () => unknown
}
const EditGroupInfoView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    avatar: '',
    desc: '',
    loading: false,
  }));

  const fileInput = useRef<HTMLInputElement>(null);

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) { return; }
    const result = await editImage({ avatar: file });
    if (!result) { return; }
    const avatar = await compressImage(result, 190 * 1024);
    if (!avatar) { return; }
    const avatarDataUrl = await blobToDataUrl(avatar.img);
    runInAction(() => {
      state.avatar = avatarDataUrl;
    });
  };

  const handleSubmit = () => {
    // if (state.loading) { return; }
    // runLoading(
    //   (l) => { state.loading = l; },
    //   async () => {
    //     await nodeService.group.editInfo({
    //       avatar: state.avatar,
    //       desc: state.desc,
    //     });
    //     snackbarService.show('修改成功，同步完成后更新');
    //     props.onClose?.();
    //   },
    // );
  };

  const loadGroupInfo = async () => {
    // await nodeService.group.updateInfo();
    // runInAction(() => {
    //   state.avatar = nodeService.state.groupInfo.avatar;
    //   state.desc = nodeService.state.groupInfo.desc;
    // });
  };

  useEffect(() => {
    loadGroupInfo();
  }, []);

  return (<>
    <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleSelectImage} />
    <div
      className={classNames(
        'flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-6',
        props.className,
      )}
    >
      <div className="text-16 font-medium">
        编辑种子网络资料
      </div>
      <div
        className="group relative cursor-pointer"
        onClick={() => fileInput.current?.click()}
      >
        <GroupAvatar
          className="shadow-2"
          size={100}
          avatar={state.avatar}
        />
        <div className="absolute right-0 bottom-0 border-black border rounded-full bg-white p-1 hidden group-hover:block">
          <CamaraIcon className="text-20" />
        </div>
      </div>

      <div className="flex-col items-stretch gap-y-4 w-[300px]">
        <FormControl size="small">
          <InputLabel>种子网络名称</InputLabel>
          <OutlinedInput
            label="种子网络名称"
            size="small"
            value={nodeService.state.groupName}
            disabled
          />
        </FormControl>
        <FormControl size="small" error={state.desc.length > 300}>
          <InputLabel>种子网络简介</InputLabel>
          <OutlinedInput
            label="种子网络简介"
            size="small"
            value={state.desc}
            onChange={action((e) => { state.desc = e.target.value; })}
            multiline
            rows={4}
          />
          <FormHelperText>
            {state.desc.length} / 300
          </FormHelperText>
        </FormControl>
      </div>
      <div className="flex gap-x-4">
        <Button
          className="rounded-full text-16 px-10 py-2"
          variant="text"
          onClick={() => !state.loading && props.onClose?.()}
          disabled={state.loading}
        >
          取消
        </Button>
        <LoadingButton
          className="rounded-full text-16 px-10 py-2"
          color="link"
          variant="outlined"
          loading={state.loading}
          onClick={handleSubmit}
        >
          确定
        </LoadingButton>
      </div>
    </div>
  </>);
});
