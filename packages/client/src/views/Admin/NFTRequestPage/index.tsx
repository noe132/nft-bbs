import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { action, runInAction, when } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { format, parseISO } from 'date-fns';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField,
} from '@mui/material';
import type { NftRequest } from 'nft-bbs-server/orm';

import { NftRequestApi } from '~/apis';
import { keyService, snackbarService } from '~/service';
import { runLoading, ThemeLight, useWiderThan } from '~/utils';
import { ExpandMore } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

export const NFTRequestPage = observer(() => {
  const state = useLocalObservable(() => ({
    offset: 0,
    limit: 20 as const,
    list: [] as Array<NftRequest>,
    loading: false,
    done: false,

    filter: 'pending' as 'all' | 'pending' | 'rejected' | 'approved',

    replyDialog: {
      open: false,
      id: 0,
      reply: '',
      type: '',
      item: null as null | NftRequest,
      loading: false,
    },
    intersectionRatio: 0,
    pauseAutoLoading: false,

    get canSubmit() {
      return !!this.replyDialog.reply && !!this.replyDialog.type;
    },
  }));
  const isPC = useWiderThan(960);
  const loadingTriggerBox = useRef<HTMLDivElement>(null);

  const loadNFTRequests = async (reset = false) => {
    if (reset) {
      await when(() => !state.loading);
      runInAction(() => {
        state.list = [];
        state.offset = 0;
        state.done = false;
      });
    }
    if (state.loading || state.done) { return; }
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        const items = await NftRequestApi.list({
          ...await keyService.getSignParams(),
          limit: state.limit,
          offset: state.offset,
          filter: state.filter,
        });
        if (!items) { return; }
        runInAction(() => {
          state.pauseAutoLoading = false;
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
      id: v.id!,
      item: v,
      reply: '',
      type: '',
      loading: false,
    };
  });

  const handleSubmit = () => {
    runLoading(
      (l) => { state.replyDialog.loading = l; },
      async () => {
        NftRequestApi.submitRequestReply({
          ...await keyService.getSignParams(),
          id: state.replyDialog.id,
          reply: state.replyDialog.reply,
          type: state.replyDialog.type,
        });
        snackbarService.show('提交成功');
        runInAction(() => {
          const item = state.list.find((v) => v.id === state.replyDialog.id);
          if (item) {
            item.status = state.replyDialog.type as any;
            item.reply = state.replyDialog.reply;
          }
          state.replyDialog.open = false;
        });
      },
    );
  };

  const init = () => {
    loadNFTRequests();
  };

  useEffect(() => {
    init();

    const loadNextPage = async () => {
      if (state.loading || state.done) { return; }
      if (state.intersectionRatio < 0.1) { return; }
      if (state.pauseAutoLoading) { return; }
      await loadNFTRequests();
      loadNextPage();
    };

    const io = new IntersectionObserver(([entry]) => {
      runInAction(() => {
        state.intersectionRatio = entry.intersectionRatio;
      });
      loadNextPage();
    }, { threshold: [0.1] });

    if (loadingTriggerBox.current) {
      io.observe(loadingTriggerBox.current);
    }
    return () => io.disconnect();
  }, []);

  return (<>
    <div className="flex-col gap-4 p-4">
      <FormControl className="mt-4">
        <FormLabel>筛选</FormLabel>
        <RadioGroup
          className="flex-row"
          value={state.filter}
          onChange={action((_, v) => { state.filter = v as any; loadNFTRequests(true); })}
        >
          <FormControlLabel value="all" control={<Radio />} label="所有" />
          <FormControlLabel value="pending" control={<Radio />} label="待处理" />
          <FormControlLabel value="rejected" control={<Radio />} label="已拒绝" />
          <FormControlLabel value="approved" control={<Radio />} label="已批准" />
        </RadioGroup>
      </FormControl>
      <div className="flex-col divide-y divide-white/30">
        {state.list.map((v, i) => (
          <div className="py-4" key={i}>
            <div>
              #{v.id}
              {' '}
              <span className="text-white/70">
                {format(parseISO(v.updatedAt!), 'yyyy-MM-dd HH:mm')}
              </span>
              {' '}
              <span className="text-white/70">
                {v.status === 'pending' && '待处理'}
                {v.status === 'approved' && '已批准'}
                {v.status === 'rejected' && '已拒绝'}
              </span>
            </div>
            <div>
              by: {v.extra?.profile?.name} ({v.by})
            </div>
            <div>
              group: {v.extra?.groupName} (#{v.groupId})
            </div>
            留言：{v.memo || '无'}
            {v.status === 'pending' && (
              <div className="mt-2">
                <Button
                  variant="outlined"
                  onClick={() => handleReply(v)}
                >
                  回复
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative flex flex-center h-12">
        <div
          className="absolute h-[400px] w-0 bottom-0 pointer-events-none"
          ref={loadingTriggerBox}
        />
        {state.loading && (
          <CircularProgress className="text-white/70" />
        )}
        {!state.loading && !state.done && (
          <Button
            className="flex-1 text-link-soft py-2"
            variant="text"
            onClick={() => loadNFTRequests()}
          >
            加载更多
            <ExpandMore />
          </Button>
        )}
        {state.done && (
          <span className="text-white/60 text-14">
            没有啦
          </span>
        )}
      </div>
    </div>

    <ThemeLight>
      <Dialog
        classes={{
          paper: classNames(
            !isPC && 'mx-2',
            'w-full max-w-[400px]',
          ),
        }}
        open={state.replyDialog.open}
        onClose={action(() => { state.replyDialog.open = false; })}
      >
        <DialogTitle>处理 NFT 申请</DialogTitle>
        <DialogContent className="overflow-visible">
          <TextField
            className="w-full"
            minRows={4}
            maxRows={6}
            label="回复"
            multiline
            value={state.replyDialog.reply}
            onChange={action((e) => { state.replyDialog.reply = e.target.value; })}
          />
          <FormControl className="mt-4">
            <FormLabel>处理类型</FormLabel>
            <RadioGroup
              value={state.replyDialog.type}
              onChange={action((e, v) => { state.replyDialog.type = v; })}
            >
              <FormControlLabel value="approved" control={<Radio />} label="批准申请✅" />
              <FormControlLabel value="rejected" control={<Radio />} label="拒绝申请❌" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions className="p-4">
          <Button
            color="inherit"
            variant="text"
            onClick={action(() => { state.replyDialog.open = false; })}
          >
            取消
          </Button>
          <LoadingButton
            color="link"
            variant="contained"
            onClick={handleSubmit}
            disabled={!state.canSubmit}
            loading={state.replyDialog.loading}
          >
            提交
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </ThemeLight>
  </>);
});
