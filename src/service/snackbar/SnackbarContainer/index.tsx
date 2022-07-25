import { useEffect } from 'react';
import classNames from 'classnames';
import { action, reaction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Button, IconButton, Snackbar, SnackbarCloseReason, SnackbarContent } from '@mui/material';
import { Close } from '@mui/icons-material';
import { themeDarkOption } from '~/utils';
import { snackbarService, SnackbarItemData } from '..';

import './index.sass';

export const SnackbarContainer = observer(() => {
  const state = useLocalObservable(() => ({
    id: 0,
    list: [] as Array<{
      id: number
      item: SnackbarItemData
      open: boolean
      entered: boolean
    }>,
  }));

  const tryLoad = action(() => {
    if (!snackbarService.state.queue.length) {
      return;
    }
    const item = snackbarService.state.queue.shift()!;
    state.id += 1;
    state.list.push({
      id: state.id,
      item,
      open: true,
      entered: false,
    });
  });

  const tryFillList = () => {
    setTimeout(action(() => {
      if (!snackbarService.state.queue.length) {
        return;
      }

      if (!state.list.length) {
        tryLoad();
      } else {
        state.list.forEach((v) => {
          if (v.item.nonBlocking && v.open && v.entered) {
            v.open = false;
          }
        });
      }
    }));
  };

  let len = snackbarService.state.queue.length;
  useEffect(() => {
    const disposes = [
      reaction(
        () => snackbarService.state.queue.length,
        () => {
          const newLen = snackbarService.state.queue.length;
          const oldLen = len;
          len = newLen;
          if (newLen <= oldLen) {
            return;
          }

          tryFillList();
        },
      ),
      reaction(
        () => state.list.length,
        () => {
          if (!state.list.length) {
            tryLoad();
          }
        },
      ),
    ];
    return () => {
      disposes.forEach((v) => v());
    };
  }, []);


  return (
    <div className="snackbar-container">
      {state.list.map((item) => (
        <Snackbar
          className={classNames(
            'snackbar-item',
            `type-${item.item.type}`,
          )}
          open={item.open}
          TransitionProps={{
            timeout: 100,
            onEntered: action(() => {
              item.entered = true;
              tryFillList();
            }),
            onExit: action(() => {
              const index = state.list.indexOf(item);
              setTimeout(() => {
                state.list.splice(index, 1);
              }, themeDarkOption.transitions.duration.leavingScreen);
            }),
          }}
          onClose={action((_e: unknown, reason: SnackbarCloseReason) => {
            if (reason === 'clickaway') {
              return;
            }
            item.open = false;
          })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          autoHideDuration={item.item.duration ?? 3000}
          key={item.id}
        >
          <SnackbarContent
            className={classNames(
              'snackbar-item-content',
              item.item.type === 'plain' && 'bg-button',
            )}
            message={
              <span>{item.item.content}</span>
            }
            action={<>
              {!!item.item.action && (
                <Button
                  className="action-button text-white"
                  color="primary"
                  size="small"
                  onClick={action(() => {
                    item.item.action?.();
                    item.open = false;
                  })}
                >
                  {item.item.actionText}
                </Button>
              )}
              <IconButton
                className="close-button"
                aria-label="close"
                color="inherit"
                onClick={action(() => { item.open = false; })}
              >
                <Close className="text-20" />
              </IconButton>
            </>}
          />
        </Snackbar>
      ))}
    </div>
  );
});
