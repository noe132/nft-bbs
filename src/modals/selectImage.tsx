import React, { useRef } from 'react';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { Button, Dialog, IconButton } from '@mui/material';
import { createPromise, ThemeLight } from '~/utils';
import { modalViewState } from './helper/modalViewState';
import { imageLib } from './imageLib';

export const selectImage = action(() => {
  const p = createPromise<File | string | null>();
  modalViewState.push({
    component: SelectImage,
    resolve: p.rs,
  });
  return p.p;
});

interface ModalProps {
  rs: (file: File | string | null) => unknown
}

const SelectImage = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleClose = action(() => {
    props.rs(null);
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog open={state.open} onClose={handleClose}>
        <div className="flex-col relative w-[400px]">
          <IconButton
            className="absolute top-2 right-2"
            onClick={handleClose}
          >
            <Close />
          </IconButton>
          <A rs={props.rs} />
        </div>
      </Dialog>
    </ThemeLight>
  );
});


const A = observer((props: { rs: (file: File | string) => unknown }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) { return; }
    props.rs(file);
  };

  const handleOpenPixabay = async () => {
    const data = await imageLib();
    if (data) {
      props.rs(data);
    }
  };

  return (<>
    <input type="file" accept="image/*" hidden ref={fileInput} onChange={handleFileChange} />
    <div className="flex-col items-center p-8 gap-y-4">
      <div className="text-18 font-medium mb-4">
        插入图像
      </div>
      <Button
        className="w-40"
        color="link"
        variant="outlined"
        onClick={() => fileInput.current?.click()}
      >
        选择图片
      </Button>
      <Button
        className="w-40"
        color="link"
        variant="outlined"
        onClick={handleOpenPixabay}
      >
        从图库选择
      </Button>
    </div>
  </>);
});
