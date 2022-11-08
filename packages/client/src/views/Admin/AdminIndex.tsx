import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { action, runInAction, when } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import type { NftRequest } from 'nft-bbs-server/orm';
import { useEffect } from 'react';
import { NftRequestApi } from '~/apis';
import { Scrollable } from '~/components';
import { keyService, nodeService } from '~/service';
import { runLoading } from '~/utils';


export const AdminIndex = observer(() => {
  const state = useLocalObservable(() => ({
    offset: 0,
    limit: 20 as const,
    list: [] as Array<NftRequest>,
    loading: false,
    done: false,

    replyDialog: {
      open: false,
      reply: '',
      type: '',
      item: null as null | NftRequest,
    },
  }));

  const loadNFTRequests = async (reset = false) => {
    if (state.loading || state.done) { return; }
    if (reset) {
      await when(() => !state.loading);
      runInAction(() => {
        state.list = [];
        state.offset = 0;
        state.done = false;
      });
    }
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const items = await NftRequestApi.list({
          ...await keyService.getAdminSignParam(),
          limit: state.limit,
          offset: state.offset,
        });
        if (!items) { return; }
        runInAction(() => {
          items.forEach((v) => {
            state.list.push(v);
          });
          state.offset += state.limit;
          state.done = items.length < state.limit;
        });
      },
    );
  };

  const handleReply = action((v: NftRequest) => {
    state.replyDialog = {
      open: true,
      item: v,
      reply: '',
      type: '',
    };
  });

  const handleSubmit = () => {
  };

  const init = async () => {
    await nodeService.config.load();
    await keyService.parseSavedLoginState();
    keyService.loginBySavedState();
    loadNFTRequests();
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div>
      <Scrollable className="bg-white/90 w-full h-[100vh]">
        <div className="flex-col gap-4">
          {state.list.map((v) => (
            <div key={v.id}>
              <div>
                {v.id} {format(parseISO(v.updatedAt!), 'yyyy-MM-dd HH:mm')}
              </div>
              <div>
                by: {v.by}
              </div>
              <div>
                group: {v.groupId}
              </div>
              留言：{v.memo || '无'}
              <Button
                onClick={() => handleReply(v)}
              >
                回复
              </Button>
            </div>
          ))}
        </div>
      </Scrollable>

      <Dialog
        open={state.replyDialog.open}
        onClose={action(() => { state.replyDialog.open = false; })}
      >
        <DialogTitle>
          处理申请
        </DialogTitle>
        <DialogContent>
          hi
        </DialogContent>
        <DialogActions>
          <Button
            onClick={action(() => { state.replyDialog.open = false; })}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});
