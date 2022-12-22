import React, { useMemo } from 'react';
import classNames from 'classnames';
import { action } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Button,
} from '@mui/material';
import { DialogItem, dialogService } from './index';
import { lang, ThemeLight } from '~/utils';

export const DialogContainer = observer(() => (
  <ThemeLight>
    {dialogService.state.dialogs.map((v) => (
      <ConfirmDialog item={v} key={v.id} />
    ))}
  </ThemeLight>
));

const ConfirmDialog = observer((props: { item: DialogItem }) => {
  const state = useLocalObservable(() => ({
    open: false,
  }));

  React.useEffect(action(() => {
    state.open = true;
  }), []);

  const handleClose = action(() => {
    props.item.rs('cancel');
    state.open = false;
  });

  const handleConfirm = action(() => {
    props.item.rs('confirm');
    state.open = false;
  });

  const maxWidth = useMemo(() => {
    if (props.item.maxWidth === undefined) { return '450px'; }
    if (!props.item.maxWidth) { return ''; }
    return `${props.item.maxWidth}px`;
  }, [props.item.maxWidth]);

  return (
    <Dialog
      {...props.item.dialogProps}
      className={classNames(
        'flex justify-center items-center',
        props.item.dialogProps?.className,
      )}
      TransitionProps={{
        className: classNames(
          'max-w-[100vw]',
          props.item.dialogProps?.TransitionProps?.className,
        ),
        ...props.item.dialogProps?.TransitionProps,
      }}
      PaperProps={{
        ...props.item.dialogProps?.PaperProps,
        style: { maxWidth, ...props.item.dialogProps?.PaperProps?.style },
      }}
      open={state.open}
      onClose={handleClose}
    >
      <DialogTitle className="mt-2 px-8 text-gray-4a">
        {props.item.title}
      </DialogTitle>
      <DialogContent className="px-8 text-16 text-gray-64">
        {props.item.content}
      </DialogContent>
      <DialogActions className="flex justify-end items-center py-3 px-6">
        {props.item.cancel !== null && (
          <Button
            className="block bg-white cursor-pointer min-w-[70px] rounded-full"
            color="inherit"
            data-test-id={props.item.cancelTestId}
            onClick={handleClose}
          >
            {props.item.cancel ?? lang.common.cancel}
          </Button>
        )}
        <Button
          className={classNames(
            'min-w-[70px] rounded-full',
            props.item.danger && 'text-red-500',
          )}
          color={props.item.danger ? 'inherit' : 'link'}
          variant="outlined"
          onClick={handleConfirm}
          data-test-id={props.item.confirmTestId}
        >
          {props.item.confirm ?? lang.common.confirm}
        </Button>
      </DialogActions>
      <span className="block pb-2" />
    </Dialog>
  );
});
