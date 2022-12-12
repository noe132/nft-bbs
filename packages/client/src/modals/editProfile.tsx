import React, { useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { Dialog, FormControl, IconButton, InputLabel, OutlinedInput } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CamaraIcon from 'boxicons/svg/regular/bx-camera.svg?fill-icon';
import { blobToDataUrl, createPromise, lang, runLoading, ThemeLight, useWiderThan } from '~/utils';
import { nftService, nodeService, snackbarService } from '~/service';
import { UserAvatar } from '~/components';

import { modalViewState } from './helper/modalViewState';
import { editImage } from './editImage';

interface EditProfileParams {
  avatar?: string
  name?: string
  intro?: string
  showSkip?: boolean
}

export const editProfile = action((props: EditProfileParams) => {
  const p = createPromise();
  modalViewState.push({
    component: EditProfileDialog,
    resolve: p.rs,
    props,
  });
  return p.p;
});

interface ModalProps extends EditProfileParams {
  rs: () => unknown
}

const EditProfileDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));
  const isPC = useWiderThan(960);

  const handleConfirm = action(() => {
    props.rs();
    state.open = false;
  });

  const handleSkip = action(() => {
    props.rs();
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog
        open={state.open}
        onClose={handleSkip}
        classes={{
          paper: classNames(
            'max-w-[400px] w-full',
            !isPC && 'mx-2',
          ),
        }}
      >
        <div className="flex-col relative">
          <IconButton
            className="absolute top-2 right-2"
            onClick={handleSkip}
          >
            <Close />
          </IconButton>
          <EditProfileView
            onConfirm={handleConfirm}
            onSkip={handleSkip}
            avatar={props.avatar}
            name={props.name}
            intro={props.intro}
          />
        </div>
      </Dialog>
    </ThemeLight>
  );
});


interface Props {
  className?: string
  avatar?: string
  name?: string
  intro?: string
  onSkip?: () => unknown
  onConfirm: () => unknown
}
export const EditProfileView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    avatar: props.avatar ?? '',
    name: props.name ?? '',
    intro: props.intro ?? '',
    loading: false,

    get introLength() {
      return Math.ceil(
        this.intro.split('').reduce(
          (p, c) => p + (c.charCodeAt(0) > 256 ? 1 : 0.5),
          0,
        ),
      );
    },
  }));

  const fileInput = useRef<HTMLInputElement>(null);

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) { return; }
    const avatar = await editImage({ avatar: file });
    if (!avatar) { return; }
    const avatarDataUrl = await blobToDataUrl(avatar);
    runInAction(() => {
      state.avatar = avatarDataUrl;
    });
  };

  const handleSubmitProfile = async () => {
    if (!nftService.hasPermissionAndTip('profile')) { return; }
    // if (state.introLength > 200) { return; }
    if (!state.name || state.loading) { return; }
    const match = /data:(.+?);base64,(.+)/.exec(state.avatar);
    const avatar = match
      ? {
        mediaType: match[1],
        content: match[2],
      }
      : undefined;
    await runLoading(
      (l) => { state.loading = l; },
      async () => {
        await nodeService.profile.submit({
          name: state.name,
          avatar,
        });
        snackbarService.show(lang.profile.editSuccess);
        props.onConfirm();
      },
    );
  };

  return (<>
    <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleSelectImage} />
    <div
      className={classNames(
        'flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-6',
        props.className,
      )}
    >
      <div className="text-16 font-medium">
        {lang.editProfile.title}
      </div>
      <div
        className="group relative w-20 h-20 cursor-pointer"
        onClick={() => fileInput.current?.click()}
      >
        <UserAvatar className="shadow-2" avatar={state.avatar} size={80} />
        <div className="absolute right-0 bottom-0 border-black border rounded-full bg-white p-[2px] hidden group-hover:block">
          <CamaraIcon className="text-16" />
        </div>
      </div>
      <div className="flex-col items-stertch gap-y-4">
        <FormControl size="small">
          <InputLabel>{lang.editProfile.nickname}</InputLabel>
          <OutlinedInput
            label={lang.editProfile.nickname}
            size="small"
            value={state.name}
            onChange={action((e) => { state.name = e.target.value; })}
          />
        </FormControl>
        {/* <FormControl size="small" error={state.introLength > 200}>
          <InputLabel>简介</InputLabel>
          <OutlinedInput
            label="简介"
            size="small"
            multiline
            rows={3}
            value={state.intro}
            onChange={action((e) => { state.intro = e.target.value; })}
          />
          <FormHelperText>
            {state.introLength} / 200
          </FormHelperText>
        </FormControl> */}
      </div>
      <LoadingButton
        className="rounded-full text-16 px-10 py-2"
        color="link"
        variant="outlined"
        loading={state.loading}
        onClick={handleSubmitProfile}
      >
        {lang.common.confirm}
      </LoadingButton>
    </div>
  </>);
});
