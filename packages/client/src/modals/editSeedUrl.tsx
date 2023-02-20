import { useEffect } from 'react';
import classNames from 'classnames';
import { either, function as fp } from 'fp-ts';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { utils } from 'rum-sdk-browser';
import { Close, Delete } from '@mui/icons-material';
import { Button, Dialog, IconButton, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { createPromise, ThemeLight } from '~/utils';

import { modalViewState } from './helper/modalViewState';
import { snackbarService } from '~/service';

export const editSeedUrl = action((seedUrl: string) => {
  const p = createPromise<string | undefined>();
  modalViewState.push({
    component: EditGroupInfoDialog,
    props: { seedUrl },
    resolve: p.rs,
  });
  return p.p;
});

interface ModalProps {
  seedUrl: string
  rs: (seedUrl?: string) => unknown
}

const EditGroupInfoDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleClose = action(() => {
    props.rs();
    state.open = false;
  });

  const handleConfirm = action((seedUrl: string) => {
    props.rs(seedUrl);
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog open={state.open} onClose={handleClose}>
        <div className="flex-col relative w-[600px]">
          <IconButton className="absolute top-2 right-2" onClick={handleClose}>
            <Close />
          </IconButton>
          <EditGroupInfoView
            seedUrl={props.seedUrl}
            onClose={handleClose}
            onConfirm={handleConfirm}
          />
        </div>
      </Dialog>
    </ThemeLight>
  );
});

interface Props {
  className?: string
  seedUrl: string
  onClose?: () => unknown
  onConfirm?: (seedUrl: string) => unknown
}
const EditGroupInfoView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    apis: [] as Array<string>,
    loading: false,
  }));

  const handleSubmit = () => {
    const url = new URL(props.seedUrl);
    const apis = state.apis.map((v) => v.trim()).filter((v) => v).join('|');
    url.searchParams.set('u', apis);
    props.onConfirm?.(url.toString());
  };

  useEffect(() => {
    fp.pipe(
      either.tryCatch(
        () => utils.restoreSeedFromUrl(props.seedUrl),
        (e) => e as Error,
      ),
      either.chainW(() => either.tryCatch(
        () => {
          const url = new URL(props.seedUrl);
          const apis = (url.searchParams.get('u') ?? '').split('|');
          runInAction(() => {
            state.apis = apis;
          });
        },
        (e) => e as Error,
      )),
      either.getOrElse(() => {
        snackbarService.show('解析种子错误');
        props.onClose?.();
      }),
    );
  }, []);

  return (
    <div
      className={classNames(
        'flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-6',
        props.className,
      )}
    >
      <div className="text-16 font-medium">
        编辑 seedurl
      </div>

      <div className="flex-col items-stretch gap-4 w-full">
        {state.apis.map((v, i) => (
          <div key={i}>
            <TextField
              className="w-full"
              value={v}
              onChange={action((e) => { state.apis[i] = e.target.value; })}
              size="small"
              InputProps={{
                className: '!pr-0',
                endAdornment: (
                  <IconButton
                    className="mx-2"
                    size="small"
                    onClick={action(() => { state.apis.splice(i, 1); })}
                  >
                    <Delete className="text-20" />
                  </IconButton>
                ),
              }}
            />
          </div>
        ))}
        <div className="flex flex-center">
          <Button
            color="rum"
            variant="outlined"
            onClick={action(() => state.apis.push(''))}
          >
            添加
          </Button>
        </div>
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
  );
});
