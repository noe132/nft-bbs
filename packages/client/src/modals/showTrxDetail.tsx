import React, { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import * as QuorumLightNodeSdk from 'quorum-light-node-sdk';
import { Close } from '@mui/icons-material';
import { Button, CircularProgress, Dialog, IconButton, Tooltip } from '@mui/material';

import { createPromise, runLoading, setClipboard, ThemeLight } from '~/utils';
import { nodeService, snackbarService } from '~/service';
import { modalViewState } from './helper/modalViewState';

export const showTrxDetail = action((trxId: string) => {
  const p = createPromise();
  modalViewState.push({
    component: TrxDetailDialog,
    resolve: p.rs,
    props: { trxId },
  });
  return p.p;
});

interface ModalProps {
  trxId: string
  rs: () => unknown
}

const TrxDetailDialog = observer((props: ModalProps) => {
  const state = useLocalObservable(() => ({
    open: true,
  }));

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
}
export const TrxDetailView = observer((props: Props) => {
  const state = useLocalObservable(() => ({
    trx: null as null | QuorumLightNodeSdk.ITrx,
    loading: false,
  }));

  useEffect(() => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const groupId = nodeService.state.groupId;
        if (!groupId) { return; }
        const trx = await QuorumLightNodeSdk.chain.Trx.get(groupId, props.trxId);
        runInAction(() => {
          state.trx = trx;
        });
      },
    );
  }, []);

  return (
    <div className="flex-col items-center px-10 mt-2">
      <div className="text-center text-16 mt-8">
        区块详情
      </div>
      <div className="w-[400px] mt-2">
        {state.loading && !state.trx && (
          <div className="flex flex-center py-12">
            <CircularProgress className="text-black/40" />
          </div>
        )}
        {!!state.trx && (
          <div
            className="grid gap-x-3 gap-y-2 mt-4 text-14"
            style={{ gridTemplateColumns: 'min-content 1fr' }}
          >
            <div>ID:</div>
            <div className="truncate">{state.trx.TrxId}</div>
            <div>GroupId:</div>
            <div className="truncate">{state.trx.GroupId}</div>
            <div>Sender:</div>
            <Tooltip title={`${state.trx.SenderPubkey} (点击复制)`} arrow placement="top" enterDelay={500} enterNextDelay={500}>
              <div
                className="truncate"
                onClick={() => { setClipboard(state.trx!.SenderPubkey); snackbarService.show('已复制'); }}
              >
                {state.trx.SenderPubkey}
              </div>
            </Tooltip>
            <div>Data:</div>
            <Tooltip title={`${state.trx.Data} (点击复制)`} arrow placement="top" enterDelay={500} enterNextDelay={500}>
              <div
                className="truncate"
                onClick={() => { setClipboard(state.trx!.Data); snackbarService.show('已复制'); }}
              >
                {state.trx.Data}
              </div>
            </Tooltip>
            <div>SenderSign:</div>
            <Tooltip title={`${state.trx.SenderSign} (点击复制)`} arrow placement="top" enterDelay={500} enterNextDelay={500}>
              <div
                className="truncate"
                onClick={() => { setClipboard(state.trx!.SenderSign); snackbarService.show('已复制'); }}
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
      </div>
      <div className="mt-4 px-3 flex pb-8 justify-center gap-x-4">
        <Button
          className="px-5 text-black/60"
          variant="text"
          onClick={() => { setClipboard(JSON.stringify(state.trx)); snackbarService.show('已复制'); }}
        >
          复制区块数据
        </Button>
        <Button
          className="px-5"
          variant="outlined"
          color="link"
          onClick={props.onConfirm}
        >
          确定
        </Button>
      </div>
    </div>
  );
});
