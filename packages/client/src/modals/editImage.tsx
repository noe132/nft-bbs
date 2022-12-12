import { useRef } from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import AvatarEditor from 'react-avatar-editor';
import { Close } from '@mui/icons-material';
import { Button, Dialog, IconButton, Slider } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { RiZoomOutLine, RiZoomInLine } from 'react-icons/ri';

import { createPromise, lang, runLoading, ThemeLight, useWiderThan } from '~/utils';
import { modalViewState } from './helper/modalViewState';
import classNames from 'classnames';

const AVATAR_SIZE = 120;

interface EditProfileParams {
  avatar: File
  maxSize?: number
}

export const editImage = action((props: EditProfileParams) => {
  const p = createPromise<Blob | null>();
  modalViewState.push({
    component: editAvatarDialog,
    resolve: p.rs,
    props,
  });
  return p.p;
});

interface ModalProps extends EditProfileParams {
  rs: (v: Blob | null) => unknown
}

const editAvatarDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));
  const isPC = useWiderThan(960);

  const handleConfirm = action((imgBase64: Blob) => {
    props.rs(imgBase64);
    state.open = false;
  });

  const handleCancel = action(() => {
    props.rs(null);
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog
        open={state.open}
        onClose={handleCancel}
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
            onClick={handleCancel}
          >
            <Close />
          </IconButton>
          <EditAvatarView
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            avatar={props.avatar}
          />
        </div>
      </Dialog>
    </ThemeLight>
  );
});

interface Props {
  className?: string
  avatar: File
  onCancel?: () => unknown
  onConfirm: (img: Blob) => unknown
}
export const EditAvatarView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    scale: 1,
    loading: false,
  }));

  const avatarEditorRef = useRef<AvatarEditor>(null);

  const handleAvatarSubmit = () => {
    if (state.loading) { return; }
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const crop = avatarEditorRef.current!.getCroppingRect();
        const img = await getCroppedImg(
          props.avatar,
          crop,
          AVATAR_SIZE,
        );
        props.onConfirm(img);
      },
    );
  };

  return (
    <div className="flex-col items-center px-10 mt-2">
      <div className="text-center text-18 pt-8 pb-4 font-bold">
        {lang.editImage.title}
      </div>
      <div className="relative mx-auto w-[200px] h-[200px] mt-2">
        <div
          className="canvas-container absolute origin-top top-0 left-1/2 -translate-x-1/2"
        >
          <AvatarEditor
            ref={avatarEditorRef}
            width={200}
            height={200}
            border={0}
            scale={state.scale}
            image={props.avatar}
          />
        </div>
      </div>
      <div className="w-[260px]">
        <div className="slider-box flex items-center gap-x-4 text-gray-500 relative mt-[0px]  py-[14px] px-0 text-28">
          <div className="text-20 opacity-50">
            <RiZoomOutLine />
          </div>
          <Slider
            step={0.001}
            min={1}
            max={4}
            onChange={action((_e, v) => { state.scale = v as number; })}
          />
          <div className="text-20 opacity-50">
            <RiZoomInLine />
          </div>
        </div>
      </div>
      <div className="mt-4 px-3 flex pb-8 justify-center">
        <Button
          className="mr-5"
          variant="text"
          onClick={props.onCancel}
        >
          {lang.common.cancel}
        </Button>
        <LoadingButton
          className="px-5"
          variant="outlined"
          color="link"
          onClick={handleAvatarSubmit}
          loading={state.loading}
        >
          {lang.common.confirm}
        </LoadingButton>
      </div>
    </div>
  );
});

const getCroppedImg = async (
  imageBlob: File,
  crop: { x: number, y: number, width: number, height: number },
  width: number,
) => {
  const image = new Image();
  const url = URL.createObjectURL(imageBlob);
  image.src = url;
  await new Promise((rs, rj) => {
    image.addEventListener('load', rs);
    image.addEventListener('error', rj);
  });
  const canvas = document.createElement('canvas');
  const state = {
    sx: image.naturalWidth * crop.x,
    sy: image.naturalHeight * crop.y,
    sWidth: image.naturalWidth * crop.width,
    sHeight: image.naturalHeight * crop.height,
    dx: 0,
    dy: 0,
    dWidth: image.naturalWidth * crop.width,
    dHeight: image.naturalHeight * crop.height,
  };

  if (state.sWidth > width || state.sHeight > width) {
    const ratio = state.sWidth > state.sHeight
      ? width / state.sWidth
      : width / state.sHeight;

    state.dWidth *= ratio;
    state.dHeight *= ratio;
  }

  canvas.width = state.dWidth;
  canvas.height = state.dHeight;
  const ctx = canvas.getContext('2d');

  ctx!.drawImage(
    image,
    state.sx,
    state.sy,
    state.sWidth,
    state.sHeight,
    state.dx,
    state.dy,
    state.dWidth,
    state.dHeight,
  );

  return new Promise<Blob>((rs, rj) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          rs(blob);
        } else {
          rj();
        }
      },
      'image/jpeg',
      1,
    );
  });
};
