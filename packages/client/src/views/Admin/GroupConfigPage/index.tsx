import { useEffect } from 'react';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { function as fp, taskEither } from 'fp-ts';
import { utils } from 'quorum-light-node-sdk';
import {
  Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, TextField, Tooltip,
} from '@mui/material';
import type { GroupConfig, GroupStatus } from 'nft-bbs-server/orm';

import { ConfigApi, GroupApi } from '~/apis';
import { runLoading, ThemeLight } from '~/utils';
import { dialogService, keyService, nodeService, snackbarService } from '~/service';
import { LoadingButton } from '@mui/lab';

export const GroupConfigPage = observer(() => {
  const state = useLocalObservable(() => ({
    groups: [] as Array<GroupStatus>,
    list: [] as Array<GroupConfig>,
    loading: false,

    setGroupConfigDialog: {
      open: false,
      loading: false,
      name: '',

      groupId: 0,
      keystore: false,
      mixin: false,
      anonymous: false,
      nft: '',
    },

    get zipped() {
      return this.groups.map((v) => {
        const seed = utils.restoreSeedFromUrl(v.mainSeedUrl);
        const config = this.list.find((u) => u.groupId === v.id);
        return {
          group: v,
          name: v.shortName || seed.group_name,
          config,
        };
      });
    },
  }));

  const loadData = () => {
    runLoading(
      (l) => { state.loading = l; },
      async () => {
        await Promise.all([
          fp.pipe(
            () => GroupApi.list(),
            taskEither.map(action((v) => {
              state.groups = v;
            })),
          )(),
          fp.pipe(
            async () => ConfigApi.list({
              ...await keyService.getAdminSignParam(),
            }),
            taskEither.map(action((v) => {
              state.list = v;
            })),
          )(),
        ]);
      },
    );
  };

  const handleCancel = action(() => {
    state.setGroupConfigDialog.open = false;
  });

  const handleEdit = action((group: GroupStatus, config?: GroupConfig) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    state.setGroupConfigDialog = {
      open: true,
      loading: false,
      name: group.shortName || seed.group_name || seed.group_id,
      groupId: group.id,
      keystore: config?.keystore ?? false,
      mixin: config?.mixin ?? false,
      anonymous: config?.anonymous ?? false,
      nft: config?.nft ?? '',
    };
  });

  const handleDelete = async (group: GroupStatus, config: GroupConfig) => {
    const seed = utils.restoreSeedFromUrl(group.mainSeedUrl);
    const result = await dialogService.open({
      title: '删除论坛配置',
      content: `确定要删除这个论坛的配置吗？(即使用默认配置)(${group.shortName || seed.group_name})`,
    });
    if (result === 'cancel') { return; }
    await ConfigApi.del({
      ...await keyService.getAdminSignParam(),
      groupId: config.groupId,
    });
    snackbarService.show('删除成功');
    runInAction(() => {
      const index = state.list.findIndex((v) => v.groupId === config.groupId);
      if (index !== -1) {
        state.list.splice(index, 1);
      }
    });
  };

  const handleSubmit = async () => {
    const {
      anonymous,
      groupId,
      keystore,
      mixin,
      nft,
    } = state.setGroupConfigDialog;
    if (!groupId) { return; }
    if (nft && !/^0x[a-zA-Z0-9]{40}$/.test(nft)) {
      snackbarService.show('nft格式不正确');
      return;
    }
    await runLoading(
      (l) => { state.setGroupConfigDialog.loading = l; },
      async () => {
        await ConfigApi.set({
          ...await keyService.getAdminSignParam(),
          anonymous,
          groupId,
          keystore,
          mixin,
          nft,
        });
        snackbarService.show(`${groupId ? '修改' : '添加'}成功`);
        runInAction(() => {
          state.setGroupConfigDialog.open = false;
        });
        loadData();
      },
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  return (<>
    <div className="flex-col gap-4 p-4">
      <div className="flex-col divide-y divide-white/30">
        {!state.zipped.length && !state.loading && (
          <div className="text-center text-white/60 text-14">
            暂无数据
          </div>
        )}
        <div className="py-4">
          <div>
            默认配置 (在 config.yml 修改)
          </div>
          <div>
            <FormControlLabel control={<Checkbox checked={nodeService.state.config.defaultGroup.keystore} />} label="keystore登录" />
            <FormControlLabel control={<Checkbox checked={nodeService.state.config.defaultGroup.mixin} />} label="mixin登录" />
            <FormControlLabel control={<Checkbox checked={nodeService.state.config.defaultGroup.anonymous} />} label="游客登录" />
          </div>
        </div>
        {!state.loading && state.zipped.map((v, i) => (
          <div className="py-4" key={i}>
            <div>
              #{v.group.id} {v.name}
            </div>
            {!v.config && '默认配置'}
            {!!v.config && (<>
              <FormControlLabel control={<Checkbox checked={v.config.keystore} />} label="keystore登录" />
              <FormControlLabel control={<Checkbox checked={v.config.mixin} />} label="mixin登录" />
              <FormControlLabel control={<Checkbox checked={v.config.anonymous} />} label="游客登录" />
              <div className="truncate">
                nft: {v.config.nft || '无'}
              </div>
            </>)}
            <div className="flex gap-4 mt-4">
              <a
                className="!no-underline"
                href={`/${v.group.shortName || v.group.id}`}
                target="_blank"
                rel="noopener"
              >
                <Button variant="outlined">
                  打开论坛
                </Button>
              </a>
              <Button
                variant="outlined"
                onClick={() => handleEdit(v.group, v.config)}
              >
                修改
              </Button>
              {!!v.config && (
                <Button
                  variant="outlined"
                  onClick={() => v.config && handleDelete(v.group, v.config)}
                >
                  删除
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {state.loading && (
        <CircularProgress className="text-white/70" />
      )}
    </div>
    <ThemeLight>
      <Dialog
        open={state.setGroupConfigDialog.open}
        onClose={action(() => { state.setGroupConfigDialog.open = false; })}
      >
        <DialogTitle>
          {!!state.setGroupConfigDialog.groupId && '编辑'}
          {!state.setGroupConfigDialog.groupId && '添加'}
          论坛配置
          {!!state.setGroupConfigDialog.groupId && ` #${state.setGroupConfigDialog.groupId} `}
          {state.setGroupConfigDialog.name}
        </DialogTitle>
        <DialogContent className="overflow-visible">
          <div className="flex-col w-[400px]">
            <Tooltip title="允许 keystore 登录" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="keystore"
                checked={state.setGroupConfigDialog.keystore}
                onChange={action((_, v) => { state.setGroupConfigDialog.keystore = v; })}
              />
            </Tooltip>
            <Tooltip title="允许 mixin 登录" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="mixin"
                checked={state.setGroupConfigDialog.mixin}
                onChange={action((_, v) => { state.setGroupConfigDialog.mixin = v; })}
              />
            </Tooltip>
            <Tooltip title="允许 游客 登录" disableInteractive placement="bottom-start">
              <FormControlLabel
                control={<Checkbox />}
                label="游客"
                checked={state.setGroupConfigDialog.anonymous}
                onChange={action((_, v) => { state.setGroupConfigDialog.anonymous = v; })}
              />
            </Tooltip>
            <Tooltip title="nft权限检查（erc-721 合约地址）" disableInteractive placement="bottom-start">
              <TextField
                className="mt-4"
                label="nft 地址"
                value={state.setGroupConfigDialog.nft}
                onChange={action((e) => { state.setGroupConfigDialog.nft = e.target.value; })}
                size="small"
              />
            </Tooltip>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={handleCancel}
          >
            取消
          </Button>
          <LoadingButton
            color="link"
            variant="contained"
            onClick={handleSubmit}
            loading={state.setGroupConfigDialog.loading}
          >
            确认
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </ThemeLight>
  </>);
});
