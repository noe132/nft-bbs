import classNames from 'classnames';
import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import * as QuorumLightNodeSdk from 'quorum-light-node-sdk';
import { Close } from '@mui/icons-material';
import { Button, CircularProgress, Dialog, IconButton, Tooltip } from '@mui/material';

import { createPromise, lang, runLoading, setClipboard, ThemeLight, useWiderThan } from '~/utils';
import { nodeService, snackbarService } from '~/service';
import { modalViewState } from './helper/modalViewState';

export const showTrxDetail = action((trxId: string, type: 'main' | 'comment') => {
  const p = createPromise();
  modalViewState.push({
    component: TrxDetailDialog,
    resolve: p.rs,
    props: { trxId, type },
  });
  return p.p;
});

interface ModalProps {
  trxId: string
  rs: () => unknown
  type: 'main' | 'comment'
}

const TrxDetailDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));
  const isPC = useWiderThan(960);

  const handleConfirm = action(() => {
    props.rs();
    state.open = false;
  });

  const handleCancel = action(() => {
    props.rs();
    state.open = false;
  });

  return (
    <ThemeLight>
      <Dialog
        open={state.open}
        onClose={handleCancel}
        classes={{
          paper: classNames(
            !isPC && 'mx-1',
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
          <TrxDetailView
            onConfirm={handleConfirm}
            trxId={props.trxId}
            type={props.type}
          />
        </div>
      </Dialog>
    </ThemeLight>
  );
});

interface Props {
  className?: string
  trxId: string
  onConfirm: () => unknown
  type: 'main' | 'comment'
}
export const TrxDetailView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    trx: null as null | QuorumLightNodeSdk.ITrx,
    loading: false,
  }));
  const isPC = useWiderThan(960);

  useEffect(() => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        let groupId;
        if (props.type === 'main') {
          groupId = nodeService.state.groupMap?.main.groupId;
        }
        if (props.type === 'comment') {
          groupId = nodeService.state.groupMap?.comment.groupId;
        }
        if (!groupId) { return; }
        const trx = await QuorumLightNodeSdk.chain.Trx.get(groupId, props.trxId);
        runInAction(() => {
          state.trx = trx;
        });
      },
    );
  }, []);

  return (
    <div
      className={classNames(
        'flex-col items-center mt-2',
        isPC && 'px-10',
        !isPC && 'px-4',
      )}
    >
      <div className="text-center text-16 mt-8">
        {lang.trxDetail.title}
      </div>
      <div className="max-w-[400px] mt-2">
        {state.loading && (
          <div className="flex flex-center py-12">
            <CircularProgress className="text-black/40" />
          </div>
        )}
        {!state.loading && !!state.trx && (
          <div
            className="grid gap-x-3 gap-y-2 mt-4 text-14"
            style={{ gridTemplateColumns: 'min-content 1fr' }}
          >
            <div>ID:</div>
            <div className="truncate">{state.trx.TrxId}</div>
            <div>GroupId:</div>
            <div className="truncate">{state.trx.GroupId}</div>
            <div>Sender:</div>
            <Tooltip title={`${state.trx.SenderPubkey} (${lang.trxDetail.clickToCopy})`} arrow placement="top" enterDelay={500} enterNextDelay={500}>
              <div
                className="truncate"
                onClick={() => { setClipboard(state.trx!.SenderPubkey); snackbarService.show(lang.trxDetail.copied); }}
              >
                {state.trx.SenderPubkey}
              </div>
            </Tooltip>
            <div>Data:</div>
            <Tooltip title={`${state.trx.Data} (${lang.trxDetail.clickToCopy})`} arrow placement="top" enterDelay={500} enterNextDelay={500}>
              <div
                className="truncate"
                onClick={() => { setClipboard(state.trx!.Data); snackbarService.show(lang.trxDetail.copied); }}
              >
                {state.trx.Data}
              </div>
            </Tooltip>
            <div>SenderSign:</div>
            <Tooltip title={`${state.trx.SenderSign} (${lang.trxDetail.clickToCopy})`} arrow placement="top" enterDelay={500} enterNextDelay={500}>
              <div
                className="truncate"
                onClick={() => { setClipboard(state.trx!.SenderSign); snackbarService.show(lang.trxDetail.copied); }}
              >
                {state.trx.SenderSign}
              </div>
            </Tooltip>
            <div>Timestamp:</div>
            <div className="truncate">{state.trx.TimeStamp}</div>
            <div>Version:</div>
            <div className="truncate">{state.trx.Version}</div>
          </div>
        )}
        {!state.loading && !state.trx && (
          <div className="flex flex-center mt-4 text-14">
            {lang.trxDetail.loadFailed}
          </div>
        )}
      </div>
      <div className="mt-4 px-3 flex pb-8 justify-center gap-x-4">
        <Button
          className="px-5 text-black/60"
          variant="text"
          onClick={() => { setClipboard(JSON.stringify(state.trx)); snackbarService.show(lang.trxDetail.copied); }}
        >
          {lang.trxDetail.copyData}
        </Button>
        <Button
          className="px-5"
          variant="outlined"
          color="link"
          onClick={props.onConfirm}
        >
          {lang.common.confirm}
        </Button>
      </div>
    </div>
  );
});
