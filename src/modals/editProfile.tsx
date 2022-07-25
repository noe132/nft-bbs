import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Close } from '@mui/icons-material';
import { Dialog, FormControl, IconButton, InputLabel, OutlinedInput } from '@mui/material';
import { createPromise, runLoading, ThemeLight } from '~/utils';
import { modalViewState } from './modalViewState';
import { LoadingButton } from '@mui/lab';
import { nodeService, snackbarService } from '~/service';

interface EditProfileParams {
  avatar?: string
  name?: string
  showSkip?: boolean
}

export const editProfile = action((params: EditProfileParams) => {
  const p = createPromise();
  modalViewState.id += 1;
  const item = {
    children: (
      <EditProfileDialog
        rs={p.rs}
        avatar={params.avatar}
        name={params.name}
        onDelete={action(() => {
          const index = modalViewState.list.indexOf(item);
          if (index !== -1) {
            modalViewState.list.splice(index, 1);
          }
        })}
        key={modalViewState.id}
      />
    ),
  };
  modalViewState.list.push(item);
  return p.p;
});

interface ModalProps {
  rs: () => unknown
  onDelete: () => unknown
  avatar?: string
  name?: string
  showSkip?: boolean
}

export const EditProfileDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

  const handleConfirm = () => {
    props.rs();
    handleClose();
  };

  const handleSkip = () => {
    props.rs();
    handleClose();
  };

  const handleClose = action(() => {
    state.open = false;
    setTimeout(props.onDelete, 1000);
  });

  return (
    <ThemeLight>
      <Dialog
        open={state.open}
        onClose={action(() => { state.open = false; })}
      >
        <div className="flex-col relative w-[400px]">
          <IconButton
            className="absolute top-2 right-2"
            onClick={action(() => { state.open = false; })}
          >
            <Close />
          </IconButton>
          <EditProfileView
            onConfirm={handleConfirm}
            onSkip={handleSkip}
            avatar={props.avatar}
            name={props.name}
            showSkip={props.showSkip}
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
  showSkip?: boolean
  onSkip?: () => unknown
  onConfirm: () => unknown
}
export const EditProfileView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    avatar: props.avatar ?? '',
    name: props.name ?? '',

    loading: false,
  }));

  const handleSubmitProfile = async () => {
    if (!state.name || state.loading) { return; }
    await runLoading(
      (l) => { state.loading = l; },
      async () => {
        await nodeService.submitProfile({
          name: state.name,
          avatar: state.avatar,
        });
        snackbarService.show('修改成功');
        props.onConfirm();
      },
    );
  };

  return (
    <div
      className={classNames(
        'flex-col flex-1 justify-between items-center p-6 pt-10 gap-y-6',
        props.className,
      )}
    >
      <div className="text-16 font-medium">
        编辑身份资料
      </div>
      <div className="w-20 h-20 bg-black/20" />
      <FormControl size="small">
        <InputLabel>昵称</InputLabel>
        <OutlinedInput
          label="昵称"
          size="small"
          value={state.name}
          onChange={action((e) => { state.name = e.target.value; })}
        />
      </FormControl>
      {props.showSkip && (
        <button className="text-gray-9c rounded-full text-14">
          暂时跳过
        </button>
      )}
      <LoadingButton
        className="rounded-full text-16 px-10 py-2"
        color="link"
        variant="outlined"
        loading={state.loading}
        onClick={handleSubmitProfile}
      >
        确定
      </LoadingButton>
    </div>
  );
});
